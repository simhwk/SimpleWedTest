"use client";

import { RANKS, STATS, isRankKey, isStatKey } from "@/lib/game";

export type QuestView = {
  id: string;
  title: string;
  story: string;
  rank: string;
  expReward: number;
  stat: string;
  statGain: number;
  status: string;
};

export default function QuestCard({
  quest,
  busy,
  onComplete,
  onAbandon,
}: {
  quest: QuestView;
  busy: boolean;
  onComplete: () => void;
  onAbandon: () => void;
}) {
  const rank = isRankKey(quest.rank) ? quest.rank : "F";
  const stat = isStatKey(quest.stat) ? quest.stat : "will";
  const glow = RANKS[rank].glow;
  const done = quest.status === "done";

  return (
    <article
      className={`animate-pop rounded-2xl border p-5 transition ${done ? "opacity-55" : ""}`}
      style={{
        borderColor: `${glow}44`,
        background: `linear-gradient(140deg, ${glow}12, transparent 68%), var(--panel)`,
      }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="rounded-md px-2 py-0.5 text-xs font-medium"
          style={{ color: glow, background: `${glow}1f`, border: `1px solid ${glow}44` }}
        >
          {rank}급
        </span>
        <span className="text-xs text-muted">+{quest.expReward} EXP</span>
        <span className="text-xs text-muted">
          {STATS[stat].emoji} {STATS[stat].label} +{quest.statGain}
        </span>
      </div>

      <h3 className={`mt-3 text-[15px] ${done ? "line-through decoration-muted" : ""}`}>
        {quest.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{quest.story}</p>

      {!done && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={onComplete}
            disabled={busy}
            className="rounded-lg px-3.5 py-2 text-sm transition disabled:opacity-40"
            style={{ background: `${glow}22`, color: glow, border: `1px solid ${glow}55` }}
          >
            완수했다
          </button>
          <button
            onClick={onAbandon}
            disabled={busy}
            className="rounded-lg border border-line px-3.5 py-2 text-sm text-muted transition hover:text-text disabled:opacity-40"
          >
            포기
          </button>
        </div>
      )}
    </article>
  );
}
