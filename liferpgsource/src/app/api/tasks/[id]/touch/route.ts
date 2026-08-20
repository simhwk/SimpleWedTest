import { NextResponse } from "next/server";

import { acknowledge } from "@/lib/ack";
import { getCurrentUser } from "@/lib/auth";
import { touchGaps, waitedDays } from "@/lib/days";
import { prisma } from "@/lib/db";

/**
 * 「했다」 — 이 앱의 주 사건.
 *
 * 완료가 아니라 시작이다. 같은 일에 여러 번 쌓이고, 그 간격이 줄어드는 것이
 * 이 앱의 진짜 지표다.
 */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const { id } = await ctx.params;

  const task = await prisma.task.findFirst({
    where: { id, userId: user.id },
    include: {
      steps: { orderBy: { depth: "desc" }, take: 1 },
      touches: { orderBy: { at: "asc" } },
    },
  });
  if (!task) return NextResponse.json({ error: "찾을 수 없어요." }, { status: 404 });

  const splitCount = task.steps[0]?.depth ?? 0;
  const days = waitedDays(task.touches.at(-1)?.at ?? task.createdAt);

  const touch = await prisma.touch.create({ data: { taskId: task.id, splitCount } });

  const text = await acknowledge({
    title: task.title,
    waitedDays: days,
    splitCount,
    touchCount: task.touches.length + 1,
  });

  return NextResponse.json({
    acknowledgement: text,
    waitedDays: days,
    touchCount: task.touches.length + 1,
    gaps: touchGaps(task.createdAt, [...task.touches.map((t) => t.at), touch.at]),
  });
}
