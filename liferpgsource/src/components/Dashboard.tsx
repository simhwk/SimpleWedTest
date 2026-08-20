"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import AchievementPanel from "@/components/AchievementPanel";
import CharacterCard, { type CharacterView } from "@/components/CharacterCard";
import QuestCard, { type QuestView } from "@/components/QuestCard";
import { ACHIEVEMENT_BY_CODE } from "@/lib/achievements";
import type { Suggestion } from "@/lib/board";
import { OUTCOMES, STATS, isStatKey, type OutcomeKind } from "@/lib/game";

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
  board,
  critChance,
  achievements: initialAchievements,
  aiEnabled,
  mailEnabled,
}: {
  nickname: string;
  character: CharacterView;
  activeQuests: QuestView[];
  doneQuests: QuestView[];
  streak: number;
  board: Suggestion[];
  critChance: number;
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
  // 수락한 제안은 게시판에서 지운다. 새로고침하면 서버가 오늘 목록을 다시 준다.
  const [taken, setTaken] = useState<string[]>([]);
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

  /** 직접 적은 것이든 게시판에서 고른 것이든 등록 경로는 하나로 둔다. */
  async function submitQuest(rawInput: string): Promise<boolean> {
    if (!rawInput || creating) return false;

    setCreating(true);
    const res = await fetch("/api/quests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawInput }),
    }).catch(() => null);

    const data = await res?.json().catch(() => null);
    const ok = Boolean(res?.ok);

    if (!ok) {
      toast(data?.error ?? "퀘스트를 만들지 못했어요.", "error");
    } else {
      setQuests((q) => [data.quest, ...q]);
      toast(`${data.quest.rank}급 의뢰가 도착했다`, "info");
    }
    setCreating(false);
    return ok;
  }

  async function createQuest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await submitQuest(input.trim())) setInput("");
  }

  /** 게시판에서 고른 제안. 실패하면 다시 고를 수 있게 목록에 되돌린다. */
  async function acceptSuggestion(suggestion: Suggestion) {
    setTaken((t) => [...t, suggestion.text]);
    const ok = await submitQuest(suggestion.text);
    if (!ok) setTaken((t) => t.filter((x) => x !== suggestion.text));
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

      // 결과부터 알린다 — 숫자보다 "터졌다" 가 먼저 눈에 들어와야 한다.
      const outcome: OutcomeKind = data.reward.outcome ?? "normal";
      const label = OUTCOMES[outcome].label;
      if (label) {
        toast(`${outcome === "critical" ? "✦ " : ""}${label} — 보상 ${OUTCOMES[outcome].multiplier}배`,
          outcome === "critical" ? "level" : "streak");
      }

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

  // 이미 받은 제안은 게시판에서 빼둔다.
  const visibleBoard = board.filter((s) => !taken.includes(s.text));

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

          <div className="rounded-2xl border border-line bg-panel/60 px-4 py-3 text-xs leading-relaxed text-muted">
            <span className="text-gold">✦ 대성공 확률 {Math.round(critChance * 100)}%</span>
            <br />
            연속 달성 하루마다 1%p 씩 오릅니다. 대성공이 뜨면 경험치가 두 배, 능력치도 하나 더.
          </div>

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

          {visibleBoard.length > 0 && (
            <div className="mt-5">
              <p className="text-xs tracking-[0.18em] text-muted">
                오늘의 의뢰 <span className="tracking-normal">— 적기 귀찮은 날엔 눌러서 받으세요</span>
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {visibleBoard.map((s) => (
                  <button
                    key={s.text}
                    type="button"
                    onClick={() => acceptSuggestion(s)}
                    disabled={creating}
                    className="rounded-full border border-line bg-panel/50 px-3.5 py-1.5 text-sm text-muted transition hover:border-accent/50 hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="mr-1.5" aria-hidden="true">{STATS[s.stat].emoji}</span>
                    {s.text}
                  </button>
                ))}
              </div>
            </div>
          )}

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
                위에서 오늘의 의뢰를 고르거나, 직접 한 줄 적어보세요.
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
