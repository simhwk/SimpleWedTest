"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type TaskView = {
  id: string;
  title: string;
  emoji: string;
  /** 마지막으로 손댄 뒤로 며칠. 한 번도 안 댔으면 올려둔 뒤로. */
  waited: number;
  touchCount: number;
  /** 손댄 간격들. 줄어드는 것이 이 앱의 진짜 진전이다. */
  gaps: number[];
};

/** 한 번에 보여주는 개수. 스무 개를 늘어놓으면 목록 자체가 죄책감이 된다. */
const VISIBLE = 3;

type Ack = { taskId: string; text: string };

export default function Today({
  tasks,
  startedCount,
  aiEnabled,
}: {
  tasks: TaskView[];
  startedCount: number;
  aiEnabled: boolean;
}) {
  const router = useRouter();

  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [expandAll, setExpandAll] = useState(false);

  const [openId, setOpenId] = useState<string | null>(null);
  const [step, setStep] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ack, setAck] = useState<Ack | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shown = expandAll ? tasks : tasks.slice(0, VISIBLE);
  const hidden = tasks.length - shown.length;

  async function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = input.trim();
    if (!title || adding) return;

    setAdding(true);
    setError(null);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }).catch(() => null);

    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setError(data?.error ?? "올려두지 못했어요.");
    } else {
      setInput("");
      router.refresh();
    }
    setAdding(false);
  }

  /** 열면 그때 조각을 받는다. 등록할 때 기다리게 하지 않기 위해서. */
  async function open(task: TaskView) {
    if (openId === task.id) {
      setOpenId(null);
      return;
    }
    setOpenId(task.id);
    setStep(null);
    setAck(null);
    setError(null);
    setLoadingStep(true);

    const res = await fetch(`/api/tasks/${task.id}/step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => null);

    const data = await res?.json().catch(() => null);
    if (res?.ok) setStep(data.step.text);
    else setError(data?.error ?? "조각을 가져오지 못했어요.");
    setLoadingStep(false);
  }

  async function smaller(task: TaskView) {
    setLoadingStep(true);
    setError(null);
    const res = await fetch(`/api/tasks/${task.id}/step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ smaller: true }),
    }).catch(() => null);

    const data = await res?.json().catch(() => null);
    if (res?.ok) setStep(data.step.text);
    else setError(data?.error ?? "다시 쪼개지 못했어요.");
    setLoadingStep(false);
  }

  async function touch(task: TaskView) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/tasks/${task.id}/touch`, { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => null);

    if (!res?.ok) {
      setError(data?.error ?? "기록하지 못했어요.");
    } else {
      setAck({ taskId: task.id, text: data.acknowledgement });
      setOpenId(null);
      setStep(null);
      router.refresh();
    }
    setBusy(false);
  }

  async function finish(task: TaskView) {
    setBusy(true);
    await fetch(`/api/tasks/${task.id}/done`, { method: "POST" }).catch(() => null);
    setOpenId(null);
    setAck(null);
    router.refresh();
    setBusy(false);
  }

  async function drop(task: TaskView) {
    setBusy(true);
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" }).catch(() => null);
    setOpenId(null);
    setAck(null);
    router.refresh();
    setBusy(false);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
      <header className="mb-9 flex items-center justify-between">
        <p className="text-xs tracking-[0.28em] text-muted">첫 삽</p>
        <button onClick={logout} className="text-sm text-muted transition hover:text-text">
          로그아웃
        </button>
      </header>

      {/* 등록 — 사용자가 내리는 결정은 0개. 한 줄 쓰고 끝. */}
      <form onSubmit={addTask} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={120}
          placeholder="미루고 있는 일 한 줄"
          aria-label="미루고 있는 일"
          className="min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-4 py-3 text-sm outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        <button
          type="submit"
          disabled={adding || !input.trim()}
          className="shrink-0 rounded-md bg-accent px-5 text-sm font-medium text-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          올려두기
        </button>
      </form>

      {error && (
        <p className="mt-3 rounded-md border border-warm/40 bg-warm-soft px-3 py-2 text-sm text-warm">
          {error}
        </p>
      )}

      {/* 인정 — 시작한 직후에만, 그 자리에서 */}
      {ack && (
        <div className="animate-rise mt-6 rounded-md border-l-2 border-warm bg-warm-soft px-5 py-4">
          <p className="text-sm leading-relaxed">{ack.text}</p>
        </div>
      )}

      <div className="mt-8">
        {tasks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-6 py-16 text-center text-sm text-muted">
            아직 올려둔 게 없습니다.
            <br />
            미루고 있는 일을 하나만 적어보세요.
          </p>
        ) : (
          <ul>
            {shown.map((task) => {
              const isOpen = openId === task.id;
              return (
                <li key={task.id} className="border-b border-line last:border-b-0">
                  <button
                    onClick={() => open(task)}
                    aria-expanded={isOpen}
                    className="flex w-full items-baseline gap-3 py-4 text-left transition hover:opacity-80"
                  >
                    <span aria-hidden="true">{task.emoji}</span>
                    <span className="flex-1 text-[0.97rem]">{task.title}</span>
                    {/* 숫자는 자라지만 앱은 침묵한다. 재촉하지 않는 것이 규칙. */}
                    <span className="num text-xs text-muted">{task.waited}일</span>
                  </button>

                  {isOpen && (
                    <div className="animate-rise pb-5">
                      <div className="rounded-md border border-accent/50 bg-accent-soft px-4 py-4">
                        <p className="text-xs tracking-[0.14em] text-accent">첫 삽 · 5분</p>
                        {loadingStep ? (
                          <p className="animate-breathe mt-2 text-sm text-muted">
                            쪼개는 중…
                          </p>
                        ) : (
                          <p className="mt-2 text-[0.97rem] leading-relaxed">{step}</p>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => touch(task)}
                          disabled={busy || loadingStep}
                          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:brightness-110 disabled:opacity-40"
                        >
                          했다
                        </button>
                        <button
                          onClick={() => smaller(task)}
                          disabled={busy || loadingStep}
                          className="rounded-md border border-line-strong px-4 py-2 text-sm text-muted transition hover:text-text disabled:opacity-40"
                        >
                          이것도 버거워
                        </button>
                        <button
                          onClick={() => setOpenId(null)}
                          disabled={busy}
                          className="rounded-md px-4 py-2 text-sm text-muted transition hover:text-text"
                        >
                          오늘은 넘길래
                        </button>
                      </div>

                      {/* 진전은 완료가 아니라 간격으로 보여준다 */}
                      {task.touchCount > 0 && (
                        <p className="num mt-4 text-xs text-muted">
                          손댄 횟수 {task.touchCount}
                          {task.gaps.length > 1 && ` · 간격 ${task.gaps.join(" → ")}일`}
                        </p>
                      )}

                      {/* 완료와 내려놓기는 조용히. 앱이 먼저 묻지 않는다. */}
                      <div className="mt-3 flex gap-4 text-xs text-muted">
                        <button onClick={() => finish(task)} disabled={busy} className="hover:text-text">
                          이거 끝났어
                        </button>
                        <button onClick={() => drop(task)} disabled={busy} className="hover:text-text">
                          내려놓기
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* 접힌 나머지. 작게, 색 없이 — 배지를 달면 수치심 쪽으로 넘어간다. */}
        {hidden > 0 && (
          <button
            onClick={() => setExpandAll(true)}
            className="num mt-4 text-xs text-muted/75 transition hover:text-muted"
          >
            그 외 {hidden}
          </button>
        )}
        {expandAll && tasks.length > VISIBLE && (
          <button
            onClick={() => setExpandAll(false)}
            className="mt-4 text-xs text-muted/75 transition hover:text-muted"
          >
            접기
          </button>
        )}
      </div>

      <footer className="mt-14 border-t border-line pt-5 text-xs leading-relaxed text-muted">
        {startedCount > 0 && (
          <p className="num text-text">지금까지 {startedCount}번 시작했습니다.</p>
        )}
        {!aiEnabled && (
          <p className="mt-2">
            <code className="text-accent">ANTHROPIC_API_KEY</code> 미설정 — 쪼개기가 임시
            문구로 대체됩니다. 이 앱의 핵심이라 키가 있어야 제대로 동작합니다.
          </p>
        )}
      </footer>
    </main>
  );
}
