import { STAT_KEYS, type StatKey } from "@/lib/game";

/**
 * 업적 카탈로그.
 * 새 업적은 여기에 한 줄 추가하면 판정·표시·해금 알림까지 전부 따라온다.
 */
export type AchievementContext = {
  totalCleared: number;
  level: number;
  streak: number;
  bestStreak: number;
  clearedRanks: string[];
  stats: Record<StatKey, number>;
};

export type AchievementDef = {
  code: string;
  name: string;
  desc: string;
  emoji: string;
  /** 숨김 업적은 해금 전까지 이름·설명을 가린다. */
  secret?: boolean;
  achieved: (ctx: AchievementContext) => boolean;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    code: "FIRST_QUEST",
    name: "첫 의뢰 완수",
    desc: "퀘스트를 하나 깬다",
    emoji: "🌱",
    achieved: (c) => c.totalCleared >= 1,
  },
  {
    code: "QUEST_10",
    name: "단골 모험가",
    desc: "퀘스트 10개 완수",
    emoji: "📜",
    achieved: (c) => c.totalCleared >= 10,
  },
  {
    code: "QUEST_50",
    name: "길드의 기둥",
    desc: "퀘스트 50개 완수",
    emoji: "🏛️",
    achieved: (c) => c.totalCleared >= 50,
  },
  {
    code: "STREAK_3",
    name: "사흘의 불씨",
    desc: "3일 연속 달성",
    emoji: "🔥",
    achieved: (c) => c.bestStreak >= 3,
  },
  {
    code: "STREAK_7",
    name: "일주일의 증명",
    desc: "7일 연속 달성",
    emoji: "⚡",
    achieved: (c) => c.bestStreak >= 7,
  },
  {
    code: "STREAK_30",
    name: "한 달을 버틴 자",
    desc: "30일 연속 달성",
    emoji: "👑",
    achieved: (c) => c.bestStreak >= 30,
  },
  {
    code: "LEVEL_5",
    name: "초보 졸업",
    desc: "Lv.5 도달",
    emoji: "⭐",
    achieved: (c) => c.level >= 5,
  },
  {
    code: "LEVEL_10",
    name: "두 자리 수",
    desc: "Lv.10 도달",
    emoji: "🌟",
    achieved: (c) => c.level >= 10,
  },
  {
    code: "RANK_S",
    name: "인생을 바꾼 하루",
    desc: "S급 의뢰를 완수한다",
    emoji: "💎",
    achieved: (c) => c.clearedRanks.includes("S"),
  },
  {
    code: "BALANCED",
    name: "육각형 인간",
    desc: "모든 능력치를 5 이상으로",
    emoji: "⬡",
    achieved: (c) => STAT_KEYS.every((k) => c.stats[k] >= 5),
  },
  {
    code: "ALL_RANKS",
    name: "F부터 S까지",
    desc: "모든 등급의 의뢰를 완수한다",
    emoji: "🎖️",
    secret: true,
    achieved: (c) => ["F", "E", "D", "C", "B", "A", "S"].every((r) => c.clearedRanks.includes(r)),
  },
];

export const ACHIEVEMENT_BY_CODE = new Map(ACHIEVEMENTS.map((a) => [a.code, a]));

/** 아직 못 딴 것 중 조건을 만족한 업적 코드들. */
export function newlyUnlocked(ctx: AchievementContext, owned: string[]): string[] {
  const ownedSet = new Set(owned);
  return ACHIEVEMENTS.filter((a) => !ownedSet.has(a.code) && a.achieved(ctx)).map((a) => a.code);
}
