import { NextRequest, NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth";
import { deleteSession } from "@/lib/userStore";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const token = getBearerToken(req);
  if (token) await deleteSession(token);
  return NextResponse.json({ ok: true });
}
