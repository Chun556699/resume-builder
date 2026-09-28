import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { getAuthUser } from "@/lib/auth";
import { consumeUserExport, getUserQuota } from "@/lib/userStore";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rl = rateLimit(`quota-consume:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });
  }

  const result = await consumeUserExport(user.id);
  const quota = await getUserQuota(user.id);
  if (!result.ok) {
    // 402：无额度，需要充值
    return NextResponse.json({ ok: false, error: "额度不足", quota }, { status: 402 });
  }
  // 返回消费凭证：客户端导出失败时凭 receiptId 调 /api/quota/refund 退还
  return NextResponse.json({ ok: true, quota, consumed: result.mode, receiptId: result.receiptId });
}
