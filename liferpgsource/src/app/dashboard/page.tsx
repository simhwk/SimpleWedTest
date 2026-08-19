import { redirect } from "next/navigation";

import Dashboard from "@/components/Dashboard";
import { aiEnabled } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mailEnabled } from "@/lib/mail";
import { displayStreak } from "@/lib/streak";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user?.character) redirect("/login");

  const [activeQuests, doneQuests, achievements] = await Promise.all([
    prisma.quest.findMany({
      where: { userId: user.id, status: "active" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.quest.findMany({
      where: { userId: user.id, status: "done" },
      orderBy: { completedAt: "desc" },
      take: 5,
    }),
    prisma.achievement.findMany({
      where: { userId: user.id },
      select: { code: true },
    }),
  ]);

  return (
    <Dashboard
      nickname={user.nickname}
      character={user.character}
      activeQuests={activeQuests}
      doneQuests={doneQuests}
      // 끊긴 스트릭은 DB 값이 아니라 오늘 날짜로 판정해서 넘긴다.
      streak={displayStreak(user.character)}
      achievements={achievements.map((a) => a.code)}
      aiEnabled={aiEnabled()}
      mailEnabled={mailEnabled()}
    />
  );
}
