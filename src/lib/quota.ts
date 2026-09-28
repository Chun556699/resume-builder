// 导出额度（游客 localStorage 版本）
// 游客：免费导出 FREE_EXPORT_COUNT 次；登录后额度由服务端维护（含付费导出与 AI 次数）。
// 游客无法使用 AI 功能（服务端要求登录），故 aiCredits 恒为 0。

import { FREE_EXPORT_COUNT } from "./pricing";

const FREE_USED_KEY = "resume:free_export_used"; // 存储已使用的免费次数
const CREDITS_KEY = "resume:paid_credits";

function read(key: string): string | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn("额度写入本地存储失败", e);
  }
}

function getFreeUsedCount(): number {
  const n = parseInt(read(FREE_USED_KEY) || "0", 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function getPaidCredits(): number {
  const n = parseInt(read(CREDITS_KEY) || "0", 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function getRemainingFree(): number {
  return Math.max(0, FREE_EXPORT_COUNT - getFreeUsedCount());
}

export interface QuotaInfo {
  freeRemaining: number;
  paidCredits: number;
  aiCredits: number;
}

export function getQuotaInfo(): QuotaInfo {
  return { freeRemaining: getRemainingFree(), paidCredits: getPaidCredits(), aiCredits: 0 };
}

export function canExport(): boolean {
  return getRemainingFree() > 0 || getPaidCredits() > 0;
}

// 尝试消费一次导出额度；成功返回 true 并扣减。
export function consumeExport(): boolean {
  if (getRemainingFree() > 0) {
    write(FREE_USED_KEY, String(getFreeUsedCount() + 1));
    return true;
  }
  const credits = getPaidCredits();
  if (credits > 0) {
    write(CREDITS_KEY, String(credits - 1));
    return true;
  }
  return false;
}

// 支付成功后增加已购导出次数。
export function addPaidCredits(n = 1) {
  write(CREDITS_KEY, String(getPaidCredits() + n));
}
