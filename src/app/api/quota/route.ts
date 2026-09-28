import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getUserQuota } from "@/lib/userStore";
import { FREE_EXPORT_COUNT } from "@/lib/pricing";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const quota = await getUserQuota(user.id);
  return NextResponse.json({ quota, freeTotal: FREE_EXPORT_COUNT });
}
