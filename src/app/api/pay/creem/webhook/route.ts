import { NextRequest, NextResponse } from "next/server";
import { creemVerifyWebhook, creemProductIdFor, getCreemConfig } from "@/lib/creem";
import { grantOrderIfPaid, getPendingOrder } from "@/lib/userStore";

// Creem 支付异步回调（webhook）。
// 与支付宝通道共用同一张订单表：验签 → 校验订单/用户/产品/金额 → grantOrderIfPaid 幂等发放。
// 必须返回 2xx 表示接收成功，否则 Creem 会按退避重试（5 次 / 24 小时）。
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("creem-signature") || "";

  // 1) 验签（HMAC-SHA256 hex，密钥为 Creem 后台 Webhook Secret）
  if (!creemVerifyWebhook(raw, signature)) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  // 2) 解析事件
  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return new NextResponse("invalid payload", { status: 400 });
  }

  // 只处理支付完成事件；其余（订阅续费/退款等）当前无对应业务，直接确认
  if (event?.eventType !== "checkout.completed") {
    return NextResponse.json({ received: true, ignored: event?.eventType || "unknown" });
  }

  const checkout = event?.object || {};
  if (checkout.status && checkout.status !== "completed") {
    return NextResponse.json({ received: true, ignored: `status=${checkout.status}` });
  }

  // 3) 取回订单号与关键元数据（创建 checkout 时由本端写入）
  const meta = checkout.metadata || {};
  const outTradeNo = String(meta.out_trade_no || "");
  if (!outTradeNo) {
    return new NextResponse("missing out_trade_no", { status: 400 });
  }

  const order = await getPendingOrder(outTradeNo);
  if (!order) {
    // 非本系统订单：确认接收，避免无限重试
    return NextResponse.json({ received: true, ignored: "unknown order" });
  }

  // 4) 归属与产品校验（防串单/串产品）
  if (meta.user_id && String(meta.user_id) !== order.userId) {
    return new NextResponse("user mismatch", { status: 400 });
  }
  const expectProduct = creemProductIdFor((order.product || "export") as "export" | "ai");
  const gotProduct = String(checkout?.product?.id || "");
  if (expectProduct && gotProduct && gotProduct !== expectProduct) {
    return new NextResponse("product mismatch", { status: 400 });
  }

  // 5) 金额校验：订单落库为美元价，Creem order.amount 为最小货币单位（美分）
  const cfg = getCreemConfig();
  if (order.amount > 0) {
    const paid = Number(checkout?.order?.amount);
    const currency = String(checkout?.order?.currency || "").toUpperCase();
    if (Number.isFinite(paid) && (!currency || currency === "USD")) {
      if (Math.abs(paid / 100 - order.amount) > 0.01) {
        return new NextResponse("amount mismatch", { status: 400 });
      }
    }
    // 非美元结算（商户后台改过货币）时跳过金额比对，以签名 + 产品校验为准
  }

  // 6) 幂等发放：与支付宝同一函数，重复通知不会重复加额度
  await grantOrderIfPaid(outTradeNo);
  void cfg;

  return NextResponse.json({ received: true, granted: true });
}
