import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const API_BASE = "https://api.siliconflow.cn/v1/chat/completions";
const OCR_MODEL = process.env.SILICONFLOW_OCR_MODEL || "Qwen/Qwen3-VL-8B-Instruct";

const SYSTEM_PROMPT = `你是一位专业的简历解析专家。请仔细识别图片中的简历内容（可能是中文或英文），并将其提取为结构化的 JSON 数据。
要求：
1. 准确提取姓名、求职岗位、联系方式（邮箱/电话/所在地/个人网站）、个人简介、工作经历、项目经历、教育经历、专业技能等。
2. 工作/项目经历的描述请拆分为多个要点，每个要点一行，用换行符分隔。
3. 无法识别的字段留空字符串或空数组，不要编造。
4. 只输出 JSON，不要输出任何解释或 Markdown 代码块标记。
5. 技能 items 用逗号分隔的字符串。`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const images: string[] = body?.images || [];

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "缺少图片数据" }, { status: 400 });
    }

    const apiKey = process.env.SILICONFLOW_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "服务端未配置 SILICONFLOW_API_KEY" }, { status: 500 });
    }

    // 逐页识别，拼接后让模型统一整理（多页简历）
    const content: any[] = [];
    images.slice(0, 4).forEach((img) => {
      content.push({ type: "image_url", image_url: { url: img } });
    });
    content.push({
      type: "text",
      text: `请将以上 ${images.length} 张图片识别为一份完整简历，输出如下结构的 JSON（字段名必须完全一致）：
{
  "personal": {"fullName":"", "jobTitle":"", "email":"", "phone":"", "location":"", "website":"", "summary":""},
  "experiences": [{"company":"", "position":"", "location":"", "startDate":"", "endDate":"", "current":false, "description":"每行一个要点，用\\n分隔"}],
  "education": [{"school":"", "degree":"", "major":"", "startDate":"", "endDate":"", "description":""}],
  "projects": [{"name":"", "role":"", "link":"", "startDate":"", "endDate":"", "description":"每行一个要点，用\\n分隔"}],
  "skills": [{"name":"", "items":"逗号分隔"}],
  "customSections": []
}
只输出 JSON。`,
    });

    const models = [OCR_MODEL, "Qwen/Qwen3-VL-30B-A3B-Instruct"].filter(Boolean);

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
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content },
            ],
            max_tokens: 4096,
            stream: false,
          }),
        });

        if (!resp.ok) {
          lastError = `${model}: ${resp.status} ${(await resp.text()).slice(0, 200)}`;
          continue;
        }

        const data = await resp.json();
        const msg = data?.choices?.[0]?.message;
        let text: string = msg?.content || "";
        if (!text && msg?.reasoning_content) text = msg.reasoning_content;

        return NextResponse.json({ content: text, model: data.model || model });
      } catch (e: any) {
        lastError = `${model}: ${e?.message || e}`;
      }
    }

    return NextResponse.json({ error: `OCR 识别失败：${lastError}` }, { status: 502 });
  } catch (e: any) {
    return NextResponse.json({ error: `请求处理失败：${e?.message || e}` }, { status: 500 });
  }
}
