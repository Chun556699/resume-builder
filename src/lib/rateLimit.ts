import { NextRequest } from "next/server";

// 进程内固定窗口速率限制。
// 适用于单实例部署（PM2 fork=1 / Docker 单容器）。
// Serverless 多实例（如 Vercel）下各实例独立计数，只能起到「尽力而为」的保护，
// 更严格的场景请接入 Redis / Upstash 或在网关层（Nginx/Caddy）限流。

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): { ok: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();

  // 惰性清理，避免 Map 无限增长（仅在桶较多时执行一次）
  if (buckets.size > 10_000) {
    buckets.forEach((b, k) => {
      if (now >= b.resetAt) buckets.delete(k);
    });
  }

  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1, retryAfterSec: 0 };
  }

  if (existing.count >= max) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return { ok: true, remaining: max - existing.count, retryAfterSec: 0 };
}

// 提取客户端 IP（优先取反代写入的 x-forwarded-for / x-real-ip）
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
