import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getAuthUser } from "@/lib/auth";
import { refundExport, getUserQuota } from "@/lib/userStore";

export const runtime = "nodejs";

// 导出失败时的额度退还：凭 /api/quota/consume 返回的一次性 receiptId 退还。
// 防滥用：凭证 15 分钟过期、一次性使用、仅限归属人，且每用户每天最多自动退还 3 次
// （超出后提示凭 UID 联系客服人工处理，服务端可在 store 中审计 receipts 记录）。
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const rl = rateLimit(`quota-refund:${user.id}`, 3, 24 * 60 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `今日自动退还次数已达上限（${rl.retryAfterSec} 秒后重置），可凭 UID 联系客服人工处理` },
      { status: 429 }
    );
  }

  let receiptId = "";
  try {
    const body = await req.json();
    if (typeof body?.receiptId === "string") receiptId = body.receiptId;
  } catch {
    /* 走下方参数校验 */
  }
  if (!receiptId) {
    return NextResponse.json({ error: "缺少退还凭证" }, { status: 400 });
  }

  const r = await refundExport(user.id, receiptId);
  if (!r.ok) {
    return NextResponse.json({ error: r.reason || "退还失败", ok: false }, { status: 409 });
  }
  return NextResponse.json({ ok: true, quota: await getUserQuota(user.id) });
}
