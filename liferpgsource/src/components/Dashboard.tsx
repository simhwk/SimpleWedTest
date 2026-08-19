"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import AchievementPanel from "@/components/AchievementPanel";
import CharacterCard, { type CharacterView } from "@/components/CharacterCard";
import QuestCard, { type QuestView } from "@/components/QuestCard";
import { ACHIEVEMENT_BY_CODE } from "@/lib/achievements";
import { STATS, isStatKey } from "@/lib/game";

type Toast = { id: number; text: string; tone: "exp" | "level" | "streak" | "info" | "error" };

const TOAST_TONES: Record<Toast["tone"], { border: string; bg: string; text: string }> = {
  exp: { border: "#7c5cff55", bg: "#7c5cff1a", text: "#e5e7ff" },
  level: { border: "#fbbf2466", bg: "#fbbf241a", text: "#fbbf24" },
  streak: { border: "#fb923c66", bg: "#fb923c1a", text: "#fdba74" },
  info: { border: "#7c5cff55", bg: "#7c5cff1a", text: "#e5e7ff" },
  error: { border: "#f43f5e66", bg: "#f43f5e1a", text: "#fda4af" },
};

export default function Dashboard({
  nickname,
  character: initialCharacter,
  activeQuests,
  doneQuests,
  streak: initialStreak,
  achievements: initialAchievements,
  aiEnabled,
  mailEnabled,
}: {
  nickname: string;
  character: CharacterView;
  activeQuests: QuestView[];
  doneQuests: QuestView[];
  streak: number;
  achievements: string[];
  aiEnabled: boolean;
  mailEnabled: boolean;
}) {
  const router = useRouter();

  const [character, setCharacter] = useState(initialCharacter);
  const [quests, setQuests] = useState(activeQuests);
  const [streak, setStreak] = useState(initialStreak);
  const [achievements, setAchievements] = useState(initialAchievements);
  const [input, setInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sendingReport, setSendingReport] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Date.now()/Math.random() 대신 단조 증가 카운터를 쓴다 — 렌더 중 호출돼도 안전하도록.
  const nextToastId = useRef(0);

  function toast(text: string, tone: Toast["tone"] = "info") {
    const id = (nextToastId.current += 1);
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }

  async function createQuest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rawInput = input.trim();
    if (!rawInput || creating) return;

    setCreating(true);
    const res = await fetch("/api/quests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawInput }),
    }).catch(() => null);

    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      toast(data?.error ?? "퀘스트를 만들지 못했어요.", "error");
    } else {
      setQuests((q) => [data.quest, ...q]);
      setInput("");
      toast(`${data.quest.rank}급 의뢰가 도착했다`, "info");
    }
    setCreating(false);
  }

  async function completeQuest(quest: QuestView) {
    setBusyId(quest.id);
    const res = await fetch(`/api/quests/${quest.id}/complete`, { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => null);

    if (!res?.ok) {
      toast(data?.error ?? "완료 처리에 실패했어요.", "error");
    } else {
      setCharacter(data.character);
      setQuests((q) => q.filter((x) => x.id !== quest.id));

      const rawStat = String(data.reward.stat);
      const stat = isStatKey(rawStat) ? rawStat : "will";
      toast(`+${data.reward.exp} EXP · ${STATS[stat].label} +${data.reward.statGain}`, "exp");

      if (data.reward.levelsGained > 0) {
        toast(`LEVEL UP! Lv.${data.character.level} — ${data.character.title}`, "level");
      }

      // 스트릭은 하루에 한 번만 늘어난다. 늘어난 순간에만 알린다.
      setStreak(data.streak.value);
      if (data.streak.extended) {
        toast(`🔥 ${data.streak.value}일 연속 달성`, "streak");
      }

      const unlocked: string[] = data.unlocked ?? [];
      if (unlocked.length > 0) {
        setAchievements((prev) => [...prev, ...unlocked]);
        for (const code of unlocked) {
          const def = ACHIEVEMENT_BY_CODE.get(code);
          if (def) toast(`업적 해금 — ${def.emoji} ${def.name}`, "level");
        }
      }

      router.refresh();
    }
    setBusyId(null);
  }

  async function abandonQuest(quest: QuestView) {
    setBusyId(quest.id);
    const res = await fetch(`/api/quests/${quest.id}`, { method: "DELETE" }).catch(() => null);

    if (!res?.ok) toast("포기 처리에 실패했어요.", "error");
    else {
      setQuests((q) => q.filter((x) => x.id !== quest.id));
      toast("의뢰를 반납했다", "info");
    }
    setBusyId(null);
  }

  async function sendReport() {
    setSendingReport(true);
    const res = await fetch("/api/report", { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => null);

    if (!res?.ok) toast(data?.error ?? "리포트 발송에 실패했어요.", "error");
    else if (data.delivered) toast("주간 보고서를 메일로 보냈어요", "info");
    else toast("SMTP 미설정 — 서버 콘솔에 보고서를 출력했어요", "info");

    setSendingReport(false);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
      <header className="mb-8 flex items-center justify-between">
        <p className="text-xs tracking-[0.3em] text-muted">내 인생 RPG</p>
        <button onClick={logout} className="text-sm text-muted transition hover:text-text">
          로그아웃
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr] lg:items-start">
        <aside className="space-y-4 lg:sticky lg:top-8">
          <CharacterCard nickname={nickname} character={character} streak={streak} />

          <button
            onClick={sendReport}
            disabled={sendingReport}
            className="w-full rounded-2xl border border-line bg-panel/60 px-4 py-3 text-sm text-muted transition hover:border-accent/50 hover:text-text disabled:opacity-50"
          >
            {sendingReport ? "작성 중…" : "📮 주간 보고서 메일로 받기"}
          </button>

          {(!aiEnabled || !mailEnabled) && (
            <p className="rounded-2xl border border-line bg-panel/40 px-4 py-3 text-xs leading-relaxed text-muted">
              {!aiEnabled && (
                <>
                  <code className="text-accent-2">ANTHROPIC_API_KEY</code> 미설정 — 퀘스트가 규칙 기반으로
                  만들어져요.
                  <br />
                </>
              )}
              {!mailEnabled && (
                <>
                  <code className="text-accent-2">SMTP_*</code> 미설정 — 메일은 서버 콘솔로 나가요.
                </>
              )}
            </p>
          )}
        </aside>

        <section>
          <form onSubmit={createQuest} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={200}
              placeholder="오늘 해야 할 일을 한 줄로… 예) 밀린 설거지 하기"
              className="flex-1 rounded-xl border border-line bg-panel/70 px-4 py-3 text-sm outline-none transition placeholder:text-muted/50 focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
            <button
              type="submit"
              disabled={creating || !input.trim()}
              className="shrink-0 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-5 font-medium text-[#0a0b14] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creating ? "변환 중" : "의뢰 등록"}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {creating && (
              <div className="shimmer h-32 rounded-2xl border border-line" aria-label="퀘스트 생성 중" />
            )}

            {quests.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                busy={busyId === quest.id}
                onComplete={() => completeQuest(quest)}
                onAbandon={() => abandonQuest(quest)}
              />
            ))}

            {!creating && quests.length === 0 && (
              <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-sm text-muted">
                수락 중인 의뢰가 없습니다.
                <br />
                위에 오늘 할 일을 적어보세요.
              </div>
            )}
          </div>

          <div className="mt-10">
            <AchievementPanel unlocked={achievements} />
          </div>

          {doneQuests.length > 0 && (
            <div className="mt-10">
              <h2 className="mb-3 text-xs tracking-[0.2em] text-muted">최근 완수한 의뢰</h2>
              <div className="space-y-3">
                {doneQuests.map((quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    busy={false}
                    onComplete={() => {}}
                    onAbandon={() => {}}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* 경험치·레벨업 알림 */}
      <div className="pointer-events-none fixed inset-x-0 bottom-8 z-50 flex flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-pop rounded-full border px-5 py-2.5 text-sm backdrop-blur"
            style={{
              borderColor: TOAST_TONES[t.tone].border,
              background: TOAST_TONES[t.tone].bg,
              color: TOAST_TONES[t.tone].text,
            }}
          >
            {t.text}
          </div>
        ))}
      </div>
    </main>
  );
}
