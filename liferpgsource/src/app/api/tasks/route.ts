import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { emojiFor } from "@/lib/emoji";

const Body = z.object({
  title: z.string().min(1, "한 줄만 적어주세요.").max(120, "120자 안으로 적어주세요."),
});

/**
 * 올려두기. 사용자가 내리는 결정은 0개 —
 * 분류도 마감일도 우선순위도 난이도도 묻지 않는다.
 *
 * 쪼개기는 여기서 하지 않는다. 등록할 때 AI 응답을 기다리게 하면
 * "간편하게" 가 그 자리에서 무너진다. 쪼개기는 그 일을 열었을 때 한다.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const title = parsed.data.title.trim();
  const task = await prisma.task.create({
    data: { userId: user.id, title, emoji: emojiFor(title) },
  });

  return NextResponse.json({ task });
}
