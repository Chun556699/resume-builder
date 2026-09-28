import { NextResponse } from "next/server";
import { isCreemConfigured, creemPriceFor } from "@/lib/creem";
import { isZpayConfigured } from "@/lib/zpay";

// 可用支付通道（公开接口）：前端据此决定是否展示「选择支付方式」步骤。
// alipay 恒可用（未配置商户号时走本地模拟）；creem 需配置 API Key + 产品后才开放。
export const runtime = "nodejs";
// 必须动态执行：否则 next build 会把本 GET 路由静态化，把构建时（通常为空）的
// CREEM_* 环境值内联进产物，导致运行时永远返回 creem:false
export const dynamic = "force-dynamic";

export async function GET() {
  const creem = isCreemConfigured();
  return NextResponse.json({
    alipay: true,
    creem,
    zpayConfigured: isZpayConfigured(),
    // Creem 美元价（Creem 后台产品定价的对端展示值）
    creemPrices: { export: creemPriceFor("export"), ai: creemPriceFor("ai") },
  });
}
