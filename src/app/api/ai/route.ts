import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://api.siliconflow.cn/v1/chat/completions";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, temperature, maxTokens } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages 不能为空" }, { status: 400 });
    }

    const apiKey = process.env.SILICONFLOW_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "服务端未配置 SILICONFLOW_API_KEY" },
        { status: 500 }
      );
    }

    const models = [
      process.env.SILICONFLOW_MODEL || "deepseek-ai/DeepSeek-V3.2",
      process.env.SILICONFLOW_MODEL_FALLBACK || "Qwen/Qwen2.5-7B-Instruct",
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
            temperature: temperature ?? 0.7,
            max_tokens: maxTokens ?? 2048,
            stream: false,
          }),
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

        return NextResponse.json({ content, model: data.model || model });
      } catch (e: any) {
        lastError = `${model}: ${e?.message || e}`;
      }
    }

    return NextResponse.json(
      { error: `所有模型调用失败：${lastError}` },
      { status: 502 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: `请求处理失败：${e?.message || e}` },
      { status: 500 }
    );
  }
}
