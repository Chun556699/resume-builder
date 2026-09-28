import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { hashPassword, isValidUsername, isValidPassword } from "@/lib/auth";
import { createUser, findUserByUsername, createSession, getUserQuota, toPublicUser } from "@/lib/userStore";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`register:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的请求" }, { status: 400 });
  }

  const username = String(body?.username || "").trim();
  const password = String(body?.password || "");

  if (!isValidUsername(username)) {
    return NextResponse.json({ error: "用户名需 3-20 位（字母/数字/下划线/中文）" }, { status: 400 });
  }
  if (!isValidPassword(password)) {
    return NextResponse.json({ error: "密码需 6-64 位且不含空格" }, { status: 400 });
  }
  if (await findUserByUsername(username)) {
    return NextResponse.json({ error: "该用户名已被注册" }, { status: 409 });
  }

  const { hash, salt } = hashPassword(password);
  let user;
  try {
    user = await createUser(username, hash, salt);
  } catch (e: any) {
    // Redis 模式下并发注册撞名（SET NX 失败）
    if (e?.message === "USERNAME_TAKEN") {
      return NextResponse.json({ error: "该用户名已被注册" }, { status: 409 });
    }
    throw e;
  }
  const token = await createSession(user.id);

  return NextResponse.json({
    token,
    user: { ...toPublicUser(user), quota: await getUserQuota(user.id) },
  });
}
