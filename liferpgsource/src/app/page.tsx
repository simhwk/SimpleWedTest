import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { RANKS, RANK_KEYS, STATS, STAT_KEYS } from "@/lib/game";

export default async function LandingPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <main className="flex-1">
      <section className="mx-auto max-w-3xl px-5 pt-24 pb-16 text-center">
        <p className="animate-rise text-xs tracking-[0.35em] text-muted">내 인생 RPG</p>

        <h1 className="animate-rise mt-6 text-4xl leading-[1.35] sm:text-5xl sm:leading-[1.3]">
          오늘 할 일이
          <br />
          <span className="bg-gradient-to-r from-accent via-fuchsia-400 to-accent-2 bg-clip-text text-transparent">
            퀘스트가 된다
          </span>
        </h1>

        <p className="animate-rise mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-muted">
          &ldquo;빨래 돌리기&rdquo; 라고 적으면 AI가 의뢰서로 바꿔줍니다.
          <br />
          깨면 경험치를 받고, 능력치가 오르고, 레벨이 오릅니다.
        </p>

        <div className="animate-rise mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-xl bg-gradient-to-r from-accent to-accent-2 px-6 py-3 font-medium text-[#0a0b14] transition hover:brightness-110"
          >
            모험 시작하기
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-line px-6 py-3 text-muted transition hover:border-accent/50 hover:text-text"
          >
            로그인
          </Link>
        </div>
      </section>

      {/* 변환 예시 — 앱이 뭘 하는지 한 눈에 */}
      <section className="mx-auto max-w-3xl px-5 pb-16">
        <div className="animate-rise grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="rounded-2xl border border-line bg-panel/60 p-5">
            <p className="text-xs text-muted">내가 적은 것</p>
            <p className="mt-2 text-[15px]">밀린 설거지 하기</p>
          </div>

          <div className="animate-pulse-glow text-center text-2xl text-accent-2">
            <span className="sm:hidden">↓</span>
            <span className="hidden sm:inline">→</span>
          </div>

          <div
            className="rounded-2xl border p-5"
            style={{
              borderColor: `${RANKS.D.glow}55`,
              background: `linear-gradient(140deg, ${RANKS.D.glow}14, transparent 70%), var(--panel)`,
            }}
          >
            <p className="text-xs" style={{ color: RANKS.D.glow }}>
              D급 의뢰 · +{RANKS.D.exp} EXP · 의지 +1
            </p>
            <p className="mt-2 text-[15px]">쌓인 그릇 산맥의 정화</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              싱크대에 잠든 도자기 유물들이 그대의 손길을 기다린다. 물의 힘으로 이들을 되돌려라.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-24">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-panel/60 p-6">
            <h2 className="text-sm text-muted">능력치 5종</h2>
            <ul className="mt-4 space-y-2.5">
              {STAT_KEYS.map((key) => (
                <li key={key} className="flex items-baseline gap-2.5 text-sm">
                  <span>{STATS[key].emoji}</span>
                  <span className="w-9">{STATS[key].label}</span>
                  <span className="text-muted">{STATS[key].desc}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-line bg-panel/60 p-6">
            <h2 className="text-sm text-muted">난이도 7단계</h2>
            <ul className="mt-4 space-y-2.5">
              {RANK_KEYS.map((key) => (
                <li key={key} className="flex items-baseline gap-2.5 text-sm">
                  <span
                    className="w-6 shrink-0 text-center font-medium"
                    style={{ color: RANKS[key].glow }}
                  >
                    {key}
                  </span>
                  <span className="text-muted">{RANKS[key].desc}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted">+{RANKS[key].exp}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
