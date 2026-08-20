import { redirect } from "next/navigation";

import Today, { type TaskView } from "@/components/Today";
import { aiEnabled } from "@/lib/ack";
import { getCurrentUser } from "@/lib/auth";
import { touchGaps, waitedDays } from "@/lib/days";
import { prisma } from "@/lib/db";

export default async function TodayPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tasks = await prisma.task.findMany({
    where: { userId: user.id, doneAt: null },
    include: { touches: { orderBy: { at: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  // 오래 묵은 것이 위로. 순서 자체가 아주 약한 압력이 된다 — 말은 하지 않는다.
  const view: TaskView[] = tasks
    .map((task) => {
      const gaps = touchGaps(task.createdAt, task.touches.map((t) => t.at));
      return {
        id: task.id,
        title: task.title,
        emoji: task.emoji,
        // 마지막으로 손댄 뒤로 며칠인지. 한 번도 안 댔으면 올려둔 뒤로.
        waited: waitedDays(task.touches.at(-1)?.at ?? task.createdAt),
        touchCount: task.touches.length,
        gaps,
      };
    })
    .sort((a, b) => b.waited - a.waited);

  const started = await prisma.touch.count({ where: { task: { userId: user.id } } });

  return <Today tasks={view} startedCount={started} aiEnabled={aiEnabled()} />;
}
