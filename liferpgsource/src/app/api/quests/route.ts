import { NextResponse } from "next/server";
import { z } from "zod";

import { generateQuest } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RANKS } from "@/lib/game";

const Body = z.object({
  rawInput: z.string().min(1, "할 일을 한 줄 적어주세요.").max(200, "200자 안으로 적어주세요."),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const rawInput = parsed.data.rawInput.trim();
  const generated = await generateQuest(rawInput);

  // 보상은 AI가 아니라 서버가 등급표를 보고 정한다 — 밸런스를 모델에 맡기지 않는다.
  const expReward = RANKS[generated.rank].exp;

  const quest = await prisma.quest.create({
    data: {
      userId: user.id,
      rawInput,
      title: generated.title,
      story: generated.story,
      rank: generated.rank,
      stat: generated.stat,
      expReward,
      statGain: 1,
    },
  });

  return NextResponse.json({ quest });
}
