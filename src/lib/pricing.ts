// 简历导出与 AI 服务的定价与额度策略（游客与登录用户共用同一套额度逻辑）
// - 游客 / 登录用户均含 1 次免费导出额度
// - 登录用户可充值导出额度（EXPORT_PRICE_YUAN 元/次）
// - AI 功能按次计费（AI_PRICE_YUAN 元/次），额度在服务端维护

export const EXPORT_PRICE_YUAN = 6.6; // 单次简历导出价格（元）
export const FREE_EXPORT_COUNT = 1; // 免费导出次数（游客 / 登录用户首次）
export const AI_PRICE_YUAN = 1; // AI 单次使用价格（元）
export const AI_MAX_BUY_COUNT = 20; // AI 次卡单笔最多购买次数

export type PayProduct = "export" | "ai";

export function formatPrice(): string {
  return `${EXPORT_PRICE_YUAN} 元`;
}
