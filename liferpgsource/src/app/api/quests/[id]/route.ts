import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** 퀘스트 포기. 기록은 남기고 목록에서만 내린다. */
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const { id } = await ctx.params;
  const result = await prisma.quest.updateMany({
    where: { id, userId: user.id, status: "active" },
    data: { status: "abandoned" },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "퀘스트를 찾을 수 없어요." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
