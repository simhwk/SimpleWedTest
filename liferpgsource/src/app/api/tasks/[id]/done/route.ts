import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** 완료는 선택적 후속이다. 앱이 먼저 묻지 않고, 눌러도 조용히 끝난다. */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const { id } = await ctx.params;
  const { count } = await prisma.task.updateMany({
    where: { id, userId: user.id, doneAt: null },
    data: { doneAt: new Date() },
  });
  if (count === 0) return NextResponse.json({ error: "찾을 수 없어요." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
