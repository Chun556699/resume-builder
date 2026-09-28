import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { getAuthUser } from "@/lib/auth";
import { consumeUserAi, grantUserAiCredit, getUserQuota } from "@/lib/userStore";

const API_BASE = "https://api.deepseek.com/chat/completions";
const MAX_BODY_BYTES = 64 * 1024; // 64KB，防止超长提示词
const UPSTREAM_TIMEOUT_MS = 120_000; // 思考型模型较慢，上游超时 120s

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // 鉴权：AI 功能需登录，防止匿名刷接口
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "请先登录后再使用 AI 功能" }, { status: 401 });
    }

    // 速率限制：同一 IP 每分钟 30 次
    const ip = getClientIp(req);
    const rl = rateLimit(`ai:${ip}`, 30, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `请求过于频繁，请 ${rl.retryAfterSec} 秒后重试` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    // 请求体大小限制（先读文本再解析，避免超大 body 被无条件缓存）
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
    const { messages, temperature, maxTokens } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages 不能为空" }, { status: 400 });
    }

    // 上游参数收紧：客户端可传 maxTokens/temperature，夹到安全区间防成本放大
    const rawMax = Number(maxTokens);
    const maxTokensSafe = Number.isFinite(rawMax) && rawMax > 0
      ? Math.max(256, Math.min(8192, Math.floor(rawMax)))
      : 4096;
    const rawTemp = Number(temperature);
    const temperatureSafe = Number.isFinite(rawTemp)
      ? Math.min(2, Math.max(0, rawTemp))
      : 0.7;

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "服务端未配置 DEEPSEEK_API_KEY" },
        { status: 500 }
      );
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

    const models = [
      process.env.DEEPSEEK_MODEL || "deepseek-flash",
      "deepseek-v4-pro",
    ].filter(Boolean);

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
            messages,
            temperature: temperatureSafe,
            max_tokens: maxTokensSafe,
            stream: false,
          }),
          signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        });

        if (!resp.ok) {
          const errText = await resp.text();
          lastError = `${model}: ${resp.status} ${errText.slice(0, 300)}`;
          continue; // 尝试备用模型
        }

        const data = await resp.json();
        const choice = data?.choices?.[0];
        const message = choice?.message;
        let content: string = message?.content ?? "";

        // 兼容思考型模型：把 reasoning_content 当作兜底内容
        if (!content && message?.reasoning_content) {
          content = message.reasoning_content;
        }

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
      { error: `所有模型调用失败：${lastError}`, code: "UPSTREAM_FAILED", quota },
      { status: 502 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: `请求处理失败：${e?.message || e}` },
      { status: 500 }
    );
  }
}
