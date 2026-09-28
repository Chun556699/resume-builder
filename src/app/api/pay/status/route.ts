import { NextRequest, NextResponse } from "next/server";
import { zpayQueryOrder } from "@/lib/zpay";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { getAuthUser } from "@/lib/auth";
import { grantOrderIfPaid, getPendingOrder, getUserQuota } from "@/lib/userStore";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "未登录", paid: false }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rl = rateLimit(`pay-status:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ code: -1, msg: "请求过于频繁", paid: false }, { status: 429 });
  }

  const outTradeNo = req.nextUrl.searchParams.get("out_trade_no") || "";
  if (!outTradeNo) {
    return NextResponse.json({ code: -1, msg: "缺少订单号", paid: false }, { status: 400 });
  }

  // 归属校验：只能查询自己的订单（不存在与他人的订单统一返回 404，避免探测）
  const order = await getPendingOrder(outTradeNo);
  if (order && order.userId !== user.id) {
    return NextResponse.json({ code: -1, msg: "订单不存在", paid: false }, { status: 404 });
  }

  // Creem 通道：发放由 webhook 异步完成，本地 granted 标记即为支付完成
  if (order && order.granted) {
    return NextResponse.json({
      paid: true,
      status: 1,
      channel: "creem",
      money: String(order.amount),
      quota: await getUserQuota(user.id),
    });
  }

  const orderStatus = await zpayQueryOrder(outTradeNo);
  const paid = Number(orderStatus.status) === 1;

  // 已支付则按订单发放额度（幂等）
  if (paid) {
    const g = await grantOrderIfPaid(outTradeNo);
    // 只把额度发放给订单创建者；查询者不同则不影响
    void g;
  }

  return NextResponse.json({
    paid,
    status: orderStatus.status,
    money: orderStatus.money,
    type: orderStatus.type,
    msg: orderStatus.msg,
    code: orderStatus.code,
    quota: await getUserQuota(user.id),
  });
}
