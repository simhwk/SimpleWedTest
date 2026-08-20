import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** 내려놓기. 벌도 기록도 없다 — 그냥 사라진다. */
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const { id } = await ctx.params;
  const { count } = await prisma.task.deleteMany({ where: { id, userId: user.id } });
  if (count === 0) return NextResponse.json({ error: "찾을 수 없어요." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
