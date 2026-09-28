import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { zpayCreateOrder, isZpayConfigured } from "@/lib/zpay";
import { creemCreateCheckout, isCreemConfigured, creemProductIdFor, creemPriceFor, getCreemConfig } from "@/lib/creem";
import { EXPORT_PRICE_YUAN, AI_PRICE_YUAN, AI_MAX_BUY_COUNT, PayProduct } from "@/lib/pricing";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { getAuthUser } from "@/lib/auth";
import { recordPendingOrder } from "@/lib/userStore";

// 生成商户订单号：RZ + 时间戳 + 加密随机数（不超过 32 位）
function genOutTradeNo(): string {
  const ts = Date.now().toString(); // 13 位
  const rand = crypto.randomBytes(4).toString("hex"); // 8 位
  return `RZ${ts}${rand}`.slice(0, 32);
}

export async function POST(req: NextRequest) {
  // 鉴权：购买需登录
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "请先登录后再购买" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rl = rateLimit(`pay-create:${ip}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
  }

  let type: "alipay" | "wxpay" = "alipay";
  let device: string = "pc";
  let product: PayProduct = "export";
  let count = 1;
  let channel: "alipay" | "creem" = "alipay";
  try {
    const body = await req.json();
    if (body?.type === "wxpay") type = "wxpay";
    if (typeof body?.device === "string" && body.device) device = body.device;
    if (body?.product === "ai") product = "ai";
    if (body?.channel === "creem") channel = "creem";
    if (typeof body?.count === "number" && Number.isFinite(body.count)) {
      count = Math.max(1, Math.min(AI_MAX_BUY_COUNT, Math.floor(body.count)));
    }
  } catch {
    /* body 为空时使用默认值 */
  }
  if (type !== "alipay" && type !== "wxpay") type = "alipay";

  const outTradeNo = genOutTradeNo();

  // ---------- Creem 国际通道（海外用户，美元计价）----------
  if (channel === "creem") {
    if (!isCreemConfigured()) {
      return NextResponse.json({ error: "国际支付通道未配置", channel }, { status: 501 });
    }
    // Creem 产品为固定单价，暂不支持一次下单多件（多买多笔）
    const creemCount = 1;
    const amountUsd = creemPriceFor(product);
    const cfg = getCreemConfig();
    const result = await creemCreateCheckout({
      productId: creemProductIdFor(product),
      successUrl: cfg.successUrl || `${req.nextUrl.origin}/`,
      requestId: outTradeNo,
      metadata: {
        out_trade_no: outTradeNo,
        user_id: user.id,
        uid: String(user.uid || ""),
        product,
        count: String(creemCount),
        amount_usd: amountUsd.toFixed(2),
      },
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.msg || "创建支付失败", channel }, { status: 502 });
    }
    // 与支付宝通道同一张订单表：落库 amount 用美元价，webhook 按此校验
    await recordPendingOrder(outTradeNo, user.id, product, creemCount, amountUsd, user.uid);
    return NextResponse.json({
      code: 1,
      channel,
      checkout_url: result.checkoutUrl,
      out_trade_no: outTradeNo,
      price: amountUsd,
      currency: "USD",
      product,
      count: creemCount,
      configured: true,
    });
  }

  // ---------- 支付宝通道（国内用户，人民币计价）----------
  if (product !== "ai") count = 1; // 导出额度单次固定 1 次
  const amount = product === "ai" ? AI_PRICE_YUAN * count : EXPORT_PRICE_YUAN;
  const result = await zpayCreateOrder({
    type,
    outTradeNo,
    name: product === "ai" ? (count > 1 ? `AI 次卡 x${count}` : "AI 次卡") : "简历导出",
    money: amount,
    clientip: ip,
    device,
    // 透传公开 UID：商户后台人工对账/补单时按此识别充值账号
    param: `uid:${user.uid || user.id}`,
  });

  // 记录订单与用户关联（含商品类型/数量/金额/下单者 UID），支付确认后按订单发放额度
  if (isZpayConfigured() && Number(result.code) === 1 && !result.mock) {
    await recordPendingOrder(outTradeNo, user.id, product, count, amount, user.uid);
  }

  return NextResponse.json({
    ...result,
    channel: "alipay",
    out_trade_no: outTradeNo,
    configured: isZpayConfigured(),
    price: amount,
    product,
    count,
  });
}
