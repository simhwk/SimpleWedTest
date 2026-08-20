import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { waitedDays } from "@/lib/days";
import { prisma } from "@/lib/db";
import { splitTask } from "@/lib/split";

/**
 * 첫 조각을 받거나, 「이것도 버거워」로 더 작은 조각을 받는다.
 *
 * 이미 조각이 있고 smaller 가 아니면 그대로 돌려준다 —
 * 같은 일을 다시 열었을 때 조각이 매번 바뀌면 신뢰가 안 생긴다.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const { id } = await ctx.params;

  // userId 를 조건에 함께 넣어 남의 일을 건드리지 못하게 막는다.
  const task = await prisma.task.findFirst({
    where: { id, userId: user.id },
    include: { steps: { orderBy: { depth: "desc" }, take: 1 } },
  });
  if (!task) return NextResponse.json({ error: "찾을 수 없어요." }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const smaller = body?.smaller === true;
  const current = task.steps[0] ?? null;

  if (current && !smaller) return NextResponse.json({ step: current });

  const depth = current ? current.depth + 1 : 0;
  const text = await splitTask({
    title: task.title,
    waitedDays: waitedDays(task.createdAt),
    depth,
    previous: current?.text,
  });

  const step = await prisma.step.create({ data: { taskId: task.id, text, depth } });
  return NextResponse.json({ step });
}
