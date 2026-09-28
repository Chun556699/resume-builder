import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { getAuthUser } from "@/lib/auth";
import { consumeUserAi, grantUserAiCredit, getUserQuota } from "@/lib/userStore";

export const runtime = "nodejs";

const API_BASE = "https://api.deepseek.com/chat/completions";
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-flash";
const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10MB（多页 base64 图片）
const MAX_TEXT_CHARS = 30_000; // 文本模式截断上限
const UPSTREAM_TIMEOUT_MS = 180_000; // 多模态/思考型模型较慢，超时 180s

const JSON_SCHEMA_INSTRUCTION = `请输出如下结构的 JSON（字段名必须完全一致）：
{
  "personal": {"fullName":"", "jobTitle":"", "email":"", "phone":"", "location":"", "website":"", "summary":""},
  "experiences": [{"company":"", "position":"", "location":"", "startDate":"", "endDate":"", "current":false, "description":"每行一个要点，用\\n分隔"}],
  "education": [{"school":"", "degree":"", "major":"", "startDate":"", "endDate":"", "description":""}],
  "projects": [{"name":"", "role":"", "link":"", "startDate":"", "endDate":"", "description":"每行一个要点，用\\n分隔"}],
  "skills": [{"name":"", "items":"逗号分隔"}],
  "customSections": []
}
要求：
1. 准确提取姓名、求职岗位、联系方式（邮箱/电话/所在地/个人网站）、个人简介、工作经历、项目经历、教育经历、专业技能等。
2. 工作/项目经历的描述请拆分为多个要点，每个要点一行，用换行符分隔。
3. 无法识别的字段留空字符串或空数组，不要编造。
4. 技能 items 用逗号分隔的字符串。
5. 只输出 JSON，不要输出任何解释或 Markdown 代码块标记。`;

const SYSTEM_PROMPT_IMAGE = `你是一位专业的简历解析专家。请仔细识别图片中的简历内容（可能是中文或英文），并将其提取为结构化的 JSON 数据。图片可能来自任意求职网站（BOSS直聘、智联招聘、前程无忧、猎聘、LinkedIn 等）的在线简历截图或导出文件，排版可能是单栏、双栏或表格。`;

const SYSTEM_PROMPT_TEXT = `你是一位专业的简历解析专家。用户提供了一份简历文本，可能来自任意求职网站（BOSS直聘、智联招聘、前程无忧、猎聘、LinkedIn 等）导出的文件，其中可能混有页眉页脚、水印、乱序的双栏排版或表格符号。请剔除与简历无关的内容（如平台 Logo 文字、广告、页码），按逻辑顺序还原真实的简历信息，并将其提取为结构化的 JSON 数据。`;

export async function POST(req: NextRequest) {
  try {
    // 鉴权：OCR 需登录
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "请先登录后再使用 OCR 功能" }, { status: 401 });
    }

    // 速率限制：同一 IP 每分钟 10 次（识别成本高）
    const ip = getClientIp(req);
    const rl = rateLimit(`ocr:${ip}`, 10, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `请求过于频繁，请 ${rl.retryAfterSec} 秒后重试` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "请求体过大" }, { status: 413 });
    }
    let body: any;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "无效的 JSON" }, { status: 400 });
    }

    // 只接受 data:image/* 形式的图片 dataURL，防把接口当任意转发代理
    const rawImages: unknown[] = Array.isArray(body?.images) ? body.images : [];
    const images: string[] = rawImages.filter(
      (x): x is string => typeof x === "string" && x.startsWith("data:image/")
    );
    const text = typeof body?.text === "string" ? body.text.trim() : "";

    if (images.length === 0 && !text) {
      return NextResponse.json({ error: "缺少图片或文本数据" }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "服务端未配置 DEEPSEEK_API_KEY" }, { status: 500 });
    }

    // 组装用户消息：文本模式（文字版 PDF 精确解析）或图片模式（截图/扫描件，最多 4 页）
    let userContent: any;
    if (text) {
      userContent = [
        {
          type: "text",
          text: `请将以下简历文本提取为结构化 JSON：\n\n${text.slice(0, MAX_TEXT_CHARS)}\n\n${JSON_SCHEMA_INSTRUCTION}`,
        },
      ];
    } else {
      userContent = [];
      images.slice(0, 4).forEach((img) => {
        userContent.push({ type: "image_url", image_url: { url: img } });
      });
      userContent.push({
        type: "text",
        text: `请将以上 ${Math.min(images.length, 4)} 张图片识别为一份完整简历，${JSON_SCHEMA_INSTRUCTION}`,
      });
    }

    // AI 按次计费：先原子扣减 1 次 AI 额度（上游全部失败时返还）
    const ok = await consumeUserAi(user.id);
    if (!ok) {
      const quota = await getUserQuota(user.id);
      return NextResponse.json(
        {
          error: "AI 额度已用完，购买 AI 次卡（1 元/次）后可继续使用",
          code: "NO_AI_CREDIT",
          quota,
        },
        { status: 402 }
      );
    }

    const models = [MODEL, "deepseek-v4-pro"].filter(Boolean);

    let lastError = "";
    for (const model of models) {
      try {
        const resp = await fetch(API_BASE, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content: text ? SYSTEM_PROMPT_TEXT : SYSTEM_PROMPT_IMAGE,
              },
              { role: "user", content: userContent },
            ],
            max_tokens: 8192,
            stream: false,
          }),
          signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        });

        if (!resp.ok) {
          lastError = `${model}: ${resp.status} ${(await resp.text()).slice(0, 200)}`;
          continue;
        }

        const data = await resp.json();
        const msg = data?.choices?.[0]?.message;
        let content: string = msg?.content || "";
        if (!content && msg?.reasoning_content) content = msg.reasoning_content;

        return NextResponse.json({
          content,
          model: data.model || model,
          quota: await getUserQuota(user.id),
        });
      } catch (e: any) {
        lastError = `${model}: ${e?.message || e}`;
      }
    }

    // 上游全部失败：返还本次扣减的额度
    await grantUserAiCredit(user.id, 1);
    const quota = await getUserQuota(user.id);
    return NextResponse.json(
      { error: `识别失败：${lastError}`, code: "UPSTREAM_FAILED", quota },
      { status: 502 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: `请求处理失败：${e?.message || e}` },
      { status: 500 }
    );
  }
}
