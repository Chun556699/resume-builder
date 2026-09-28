import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { verifyPassword, burnDummyVerify } from "@/lib/auth";
import { findUserByUsername, createSession, getUserQuota, toPublicUser } from "@/lib/userStore";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`login:${ip}`, 15, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "登录尝试过于频繁，请稍后再试" }, { status: 429 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的请求" }, { status: 400 });
  }

  const username = String(body?.username || "").trim();
  const password = String(body?.password || "");
  if (!username || !password) {
    return NextResponse.json({ error: "请输入用户名和密码" }, { status: 400 });
  }

  const user = await findUserByUsername(username);
  // 用户名不存在时也走一次等耗时的 dummy 校验，避免时序侧信道（响应时间区分用户名是否存在）
  if (!user) {
    burnDummyVerify(password);
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }
  if (!verifyPassword(password, user.salt, user.passwordHash)) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  const token = await createSession(user.id);
  return NextResponse.json({
    token,
    user: { ...toPublicUser(user), quota: await getUserQuota(user.id) },
  });
}
