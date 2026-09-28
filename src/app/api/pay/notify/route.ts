import { NextRequest, NextResponse } from "next/server";
import { zpayVerifyNotify, getZpayConfig } from "@/lib/zpay";
import { grantOrderIfPaid, getPendingOrder } from "@/lib/userStore";

// 支付异步通知回调（ZPAY 通过 notify_url 通知）
// 校验签名与金额后返回 success（必须为纯小写字符串，否则平台会重试）。
export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  return await handleNotify(params);
}

export async function POST(req: NextRequest) {
  let params: Record<string, string> = {};
  const contentType = req.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      params = (await req.json()) as Record<string, string>;
    } else {
      const text = await req.text();
      params = Object.fromEntries(new URLSearchParams(text).entries());
    }
  } catch {
    params = {};
  }
  return await handleNotify(params);
}

async function handleNotify(params: Record<string, string>) {
  const cfg = getZpayConfig();
  if (!cfg.pid || !cfg.key) {
    return new NextResponse("success", { status: 200 });
  }

  // 商户 ID 校验（防串单）
  if (params.pid && params.pid !== cfg.pid) {
    return new NextResponse("fail", { status: 400 });
  }
  // 签名校验
  if (!zpayVerifyNotify(params, cfg.key)) {
    return new NextResponse("fail", { status: 400 });
  }
  // 支付状态校验
  if (params.trade_status !== "TRADE_SUCCESS") {
    return new NextResponse("fail", { status: 400 });
  }
  // 金额校验：以订单记录的金额为准（导出额度与 AI 次卡价格不同）
  if (params.out_trade_no && params.money) {
    const order = await getPendingOrder(params.out_trade_no);
    if (order && order.amount > 0 && Math.abs(parseFloat(params.money) - order.amount) > 0.001) {
      return new NextResponse("fail", { status: 400 });
    }
  }

  // 支付成功：按订单发放额度（幂等，重复通知不会重复发放）
  if (params.out_trade_no) {
    await grantOrderIfPaid(params.out_trade_no);
  }

  return new NextResponse("success", { status: 200 });
}
