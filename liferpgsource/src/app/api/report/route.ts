import { NextResponse } from "next/server";

import { generateWeeklyReport } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { displayStreak } from "@/lib/streak";
import { ACHIEVEMENT_BY_CODE } from "@/lib/achievements";

/** 지난 7일 활동을 AI가 편지로 써서 가입 이메일로 보낸다. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user?.character) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [completed, pending, achievements] = await Promise.all([
    prisma.quest.findMany({
      where: { userId: user.id, status: "done", completedAt: { gte: weekAgo } },
      orderBy: { completedAt: "desc" },
      take: 30,
    }),
    prisma.quest.findMany({
      where: { userId: user.id, status: "active" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.achievement.findMany({
      where: { userId: user.id, unlockedAt: { gte: weekAgo } },
      select: { code: true },
    }),
  ]);

  const body = await generateWeeklyReport({
    nickname: user.nickname,
    level: user.character.level,
    title: user.character.title,
    completed: completed.map((q) => ({ title: q.title, rank: q.rank })),
    pending: pending.map((q) => ({ title: q.title })),
    expGained: completed.reduce((sum, q) => sum + q.expReward, 0),
    streak: displayStreak(user.character),
    bestStreak: user.character.bestStreak,
    achievements: achievements
      .map((a) => ACHIEVEMENT_BY_CODE.get(a.code))
      .filter((d) => d !== undefined)
      .map((d) => `${d.emoji} ${d.name}`),
  });

  const result = await sendMail({
    to: user.email,
    subject: `[내 인생 RPG] ${user.nickname} 님의 주간 보고서`,
    body,
  });

  return NextResponse.json({
    ...result,
    preview: body,
    stats: { completed: completed.length, pending: pending.length },
  });
}
