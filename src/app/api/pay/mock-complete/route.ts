import { NextRequest, NextResponse } from "next/server";
import { isZpayConfigured } from "@/lib/zpay";
import { getAuthUser } from "@/lib/auth";
import { grantUserCredit, grantUserAiCredit, getUserQuota } from "@/lib/userStore";

// 仅本地未配置 ZPAY 商户信息时可用，模拟支付成功发放额度（方便预览完整流程）。
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (isZpayConfigured()) {
    return NextResponse.json({ error: "已配置正式支付，模拟接口不可用" }, { status: 403 });
  }
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  let product = "export";
  try {
    const body = await req.json();
    if (body?.product === "ai") product = "ai";
  } catch {
    /* 无 body 时默认导出额度 */
  }
  if (product === "ai") {
    await grantUserAiCredit(user.id, 1);
  } else {
    await grantUserCredit(user.id, 1);
  }
  return NextResponse.json({ ok: true, quota: await getUserQuota(user.id) });
}
