"use client";

import { STATS, STAT_KEYS, expToNextLevel, type StatKey } from "@/lib/game";

export type CharacterView = {
  level: number;
  exp: number;
  title: string;
  strength: number;
  intellect: number;
  charm: number;
  vitality: number;
  will: number;
  streak: number;
  bestStreak: number;
  lastClearDay: string | null;
};

export default function CharacterCard({
  nickname,
  character,
  streak,
}: {
  nickname: string;
  character: CharacterView;
  /** 서버가 "오늘 기준"으로 계산해 넘겨준 값. 끊긴 스트릭은 0 으로 온다. */
  streak: number;
}) {
  const need = expToNextLevel(character.level);
  const percent = Math.min(100, Math.round((character.exp / need) * 100));
  // 하한선을 둬서 Lv.1(전부 1)일 때 모든 바가 꽉 차 보이지 않게 한다.
  const maxStat = Math.max(...STAT_KEYS.map((k) => character[k]), 8);

  return (
    <div className="rounded-3xl border border-line bg-panel/70 p-6 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted">{character.title}</p>
          <p className="mt-1 text-xl">{nickname}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">LEVEL</p>
          <p className="text-3xl leading-none text-gold tabular-nums">{character.level}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm">
        <span className={streak > 0 ? "" : "grayscale opacity-40"}>🔥</span>
        {streak > 0 ? (
          <span>
            <span className="tabular-nums text-orange-300">{streak}일</span>
            <span className="text-muted"> 연속 달성 중</span>
          </span>
        ) : (
          <span className="text-muted">오늘 하나 깨면 스트릭 시작</span>
        )}
        {character.bestStreak > 0 && (
          <span className="ml-auto text-xs text-muted tabular-nums">최고 {character.bestStreak}일</span>
        )}
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex items-baseline justify-between text-xs text-muted">
          <span>EXP</span>
          <span className="tabular-nums">
            {character.exp} / {need}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-bg-soft">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-[width] duration-700 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="mt-6 space-y-2.5">
        {STAT_KEYS.map((key) => (
          <StatRow key={key} statKey={key} value={character[key]} max={maxStat} />
        ))}
      </div>
    </div>
  );
}

function StatRow({ statKey, value, max }: { statKey: StatKey; value: number; max: number }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-5 text-center">{STATS[statKey].emoji}</span>
      <span className="w-9 shrink-0 text-muted">{STATS[statKey].label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-soft">
        <div
          className="h-full rounded-full bg-accent/70 transition-[width] duration-700 ease-out"
          style={{ width: `${Math.max(5, (value / max) * 100)}%` }}
        />
      </div>
      <span className="w-6 shrink-0 text-right tabular-nums text-muted">{value}</span>
    </div>
  );
}
