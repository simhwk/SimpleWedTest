"use client";

import { ACHIEVEMENTS } from "@/lib/achievements";

export default function AchievementPanel({ unlocked }: { unlocked: string[] }) {
  const owned = new Set(unlocked);

  return (
    <div className="rounded-2xl border border-line bg-panel/60 p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm text-muted">업적</h2>
        <span className="text-xs tabular-nums text-muted">
          {owned.size} / {ACHIEVEMENTS.length}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const got = owned.has(a.code);
          // 숨김 업적은 해금 전까지 정체를 가려서 발견하는 재미를 남긴다.
          const hidden = a.secret && !got;

          return (
            <div
              key={a.code}
              title={hidden ? "숨겨진 업적" : `${a.name} — ${a.desc}`}
              className={`rounded-xl border px-3 py-2.5 transition ${
                got
                  ? "border-gold/40 bg-gold/10"
                  : "border-line bg-bg-soft/40 opacity-45 grayscale"
              }`}
            >
              <div className="text-lg leading-none">{hidden ? "❔" : a.emoji}</div>
              <div className={`mt-1.5 text-xs ${got ? "text-gold" : "text-muted"}`}>
                {hidden ? "???" : a.name}
              </div>
              <div className="mt-0.5 text-[11px] leading-snug text-muted">
                {hidden ? "조건은 비밀" : a.desc}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
