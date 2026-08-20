import { NextResponse } from "next/server";

import { newlyUnlocked, type AchievementContext } from "@/lib/achievements";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { applyExp, applyOutcome, isStatKey, rollOutcome, titleForLevel, STAT_KEYS } from "@/lib/game";
import { advanceStreak, dayKey, displayStreak } from "@/lib/streak";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.character) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const { id } = await ctx.params;

  // userId 를 조건에 함께 넣어 남의 퀘스트를 완료 처리하지 못하게 막는다.
  const quest = await prisma.quest.findFirst({ where: { id, userId: user.id } });
  if (!quest) return NextResponse.json({ error: "퀘스트를 찾을 수 없어요." }, { status: 404 });
  if (quest.status === "done") {
    return NextResponse.json({ error: "이미 완료한 퀘스트예요." }, { status: 409 });
  }

  const character = user.character;
  const today = dayKey();
  const statKey = isStatKey(quest.stat) ? quest.stat : "will";

  // 결과는 서버에서 굴린다 — 클라이언트가 굴리면 마음에 들 때까지 다시 굴릴 수 있다.
  // 확률의 기준은 화면에 보이는 스트릭과 같은 값이라, 끊긴 스트릭은 0 으로 친다.
  const outcome = rollOutcome(displayStreak(character, today));
  const reward = applyOutcome(quest.expReward, quest.statGain, outcome);

  const { level, exp, levelsGained } = applyExp(character.level, character.exp, reward.exp);
  const streak = advanceStreak(character, today);

  // 퀘스트 완료와 캐릭터 성장은 한 트랜잭션으로 묶는다. 경험치만 오르고 퀘스트가 안 닫히면 무한 파밍이 된다.
  const [, updatedCharacter] = await prisma.$transaction([
    prisma.quest.update({
      where: { id: quest.id },
      data: { status: "done", completedAt: new Date() },
    }),
    prisma.character.update({
      where: { id: character.id },
      data: {
        level,
        exp,
        title: titleForLevel(level),
        streak: streak.streak,
        bestStreak: streak.bestStreak,
        lastClearDay: streak.lastClearDay,
        [statKey]: { increment: reward.statGain },
      },
    }),
  ]);

  const unlocked = await checkAchievements(user.id, updatedCharacter);

  return NextResponse.json({
    character: updatedCharacter,
    reward: { exp: reward.exp, baseExp: quest.expReward, stat: statKey, statGain: reward.statGain, levelsGained, outcome },
    streak: { value: streak.streak, extended: streak.extended, best: streak.bestStreak },
    unlocked,
  });
}

/** 완료 직후의 상태로 업적 조건을 다시 판정하고, 새로 딴 것만 저장해 돌려준다. */
async function checkAchievements(
  userId: string,
  character: {
    level: number;
    streak: number;
    bestStreak: number;
    strength: number;
    intellect: number;
    charm: number;
    vitality: number;
    will: number;
  },
) {
  const [cleared, owned] = await Promise.all([
    prisma.quest.findMany({
      where: { userId, status: "done" },
      select: { rank: true },
    }),
    prisma.achievement.findMany({ where: { userId }, select: { code: true } }),
  ]);

  const context: AchievementContext = {
    totalCleared: cleared.length,
    level: character.level,
    streak: character.streak,
    bestStreak: character.bestStreak,
    clearedRanks: [...new Set(cleared.map((q) => q.rank))],
    stats: Object.fromEntries(STAT_KEYS.map((k) => [k, character[k]])) as AchievementContext["stats"],
  };

  const codes = newlyUnlocked(context, owned.map((a) => a.code));
  if (codes.length === 0) return [];

  // 동시 요청으로 같은 업적이 두 번 들어와도 upsert 라 안전하다. (userId, code) 유니크 제약이 받쳐준다.
  await Promise.all(
    codes.map((code) =>
      prisma.achievement.upsert({
        where: { userId_code: { userId, code } },
        create: { userId, code },
        update: {},
      }),
    ),
  );

  return codes;
}
