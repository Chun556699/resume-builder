import crypto from "crypto";
import { NextRequest } from "next/server";
import { getUserByToken } from "./userStore";

// 密码散列（scrypt，随机盐，服务端不存明文）
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  try {
    const hash = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHash, "hex");
    return hash.length === expected.length && crypto.timingSafeEqual(hash, expected);
  } catch {
    return false;
  }
}

// 用户名不存在时消耗等量 CPU（dummy scrypt），使两条失败路径耗时相近，缓解时序侧信道
const DUMMY_SALT = "0".repeat(32);
const DUMMY_HASH = "0".repeat(128);
export function burnDummyVerify(password: string): void {
  verifyPassword(password, DUMMY_SALT, DUMMY_HASH);
}

// 校验用户名：3-20 位字母/数字/下划线/中文
export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_\u4e00-\u9fa5]{3,20}$/.test(username);
}

// 校验密码：6-64 位，不含空白
export function isValidPassword(password: string): boolean {
  return typeof password === "string" && password.length >= 6 && password.length <= 64 && !/\s/.test(password);
}

// 从请求头解析 Bearer token 并返回对应用户（未登录返回 null）
export async function getAuthUser(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  return (await getUserByToken(token)) || null;
}

// 从 Authorization 头解析 token
export function getBearerToken(req: NextRequest): string {
  const auth = req.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
}
