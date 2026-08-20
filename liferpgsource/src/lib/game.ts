/**
 * 게임 규칙이 모여 있는 곳.
 * 레벨 곡선, 등급, 칭호처럼 "밸런스"에 해당하는 값은 전부 여기서만 고친다.
 */

export const STATS = {
  strength: { label: "힘", emoji: "💪", desc: "운동하고 몸 쓰는 일" },
  intellect: { label: "지능", emoji: "🧠", desc: "공부하고 배우는 일" },
  charm: { label: "매력", emoji: "✨", desc: "사람 만나고 챙기는 일" },
  vitality: { label: "체력", emoji: "🌿", desc: "자고 먹고 회복하는 일" },
  will: { label: "의지", emoji: "🔥", desc: "미루던 걸 끝내는 일" },
} as const;

export type StatKey = keyof typeof STATS;
export const STAT_KEYS = Object.keys(STATS) as StatKey[];

export function isStatKey(v: string): v is StatKey {
  return (STAT_KEYS as string[]).includes(v);
}

export const RANKS = {
  F: { label: "F", exp: 15, glow: "#8b93a7", desc: "1분이면 끝나는 일" },
  E: { label: "E", exp: 30, glow: "#4ade80", desc: "가볍게 해치우는 일" },
  D: { label: "D", exp: 55, glow: "#38bdf8", desc: "조금 귀찮은 일" },
  C: { label: "C", exp: 90, glow: "#a78bfa", desc: "마음먹어야 하는 일" },
  B: { label: "B", exp: 140, glow: "#f472b6", desc: "반나절은 걸리는 일" },
  A: { label: "A", exp: 220, glow: "#fb923c", desc: "며칠을 각오하는 일" },
  S: { label: "S", exp: 400, glow: "#fbbf24", desc: "인생이 바뀌는 일" },
} as const;

export type RankKey = keyof typeof RANKS;
export const RANK_KEYS = Object.keys(RANKS) as RankKey[];

export function isRankKey(v: string): v is RankKey {
  return (RANK_KEYS as string[]).includes(v);
}

/** 다음 레벨까지 필요한 누적 경험치. 레벨이 오를수록 완만하게 늘어난다. */
export function expToNextLevel(level: number): number {
  return 100 + (level - 1) * 45;
}

/**
 * 경험치를 더한 뒤의 레벨/잔여 경험치를 계산한다.
 * 한 번에 여러 레벨이 오를 수 있어서 while 로 돈다.
 */
export function applyExp(level: number, exp: number, gained: number) {
  let nextLevel = level;
  let nextExp = exp + gained;
  let levelsGained = 0;

  while (nextExp >= expToNextLevel(nextLevel)) {
    nextExp -= expToNextLevel(nextLevel);
    nextLevel += 1;
    levelsGained += 1;
  }

  return { level: nextLevel, exp: nextExp, levelsGained };
}

const TITLES: { min: number; title: string }[] = [
  { min: 1, title: "갓 눈뜬 초보 모험가" },
  { min: 3, title: "할 일 목록의 도전자" },
  { min: 5, title: "미루기를 이겨낸 자" },
  { min: 8, title: "꾸준함의 수련생" },
  { min: 12, title: "일상의 숙련자" },
  { min: 17, title: "생활력 상급 헌터" },
  { min: 23, title: "루틴의 지배자" },
  { min: 30, title: "갓생의 화신" },
  { min: 40, title: "전설이 된 생활인" },
];

export function titleForLevel(level: number): string {
  let found = TITLES[0].title;
  for (const t of TITLES) if (level >= t.min) found = t.title;
  return found;
}

/** 스탯 총합에 따라 캐릭터를 한 줄로 요약해준다. */
export function statSummary(stats: Record<StatKey, number>): string {
  const top = STAT_KEYS.reduce((a, b) => (stats[b] > stats[a] ? b : a));
  return `${STATS[top].emoji} ${STATS[top].label} 특화형`;
}

/**
 * 받침 유무에 따라 조사를 고른다. "의지이(가)" 같은 어색한 표기를 없애기 위해.
 * 한글 음절은 0xAC00 부터 28개 종성 단위로 배열돼 있어서, 나머지가 0이면 받침이 없다.
 */
export function withParticle(word: string, withBatchim: string, withoutBatchim: string): string {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);

  // 한글 음절 영역이 아니면(영문·숫자 등) 안전하게 받침 있는 쪽을 쓴다.
  if (code < 0xac00 || code > 0xd7a3) return `${word}${withBatchim}`;

  const hasBatchim = (code - 0xac00) % 28 !== 0;
  return `${word}${hasBatchim ? withBatchim : withoutBatchim}`;
}

/* ------------------------------------------------------------------ *
 * 완수 결과
 *
 * 같은 등급이어도 매번 같은 보상이 나오면 깰 이유가 옅어진다.
 * 그래서 완수 시 한 번 굴려서 결과를 가른다.
 *
 * 대성공 확률은 스트릭에 비례한다 — 스트릭이 숫자로만 남지 않고
 * 실제로 보상을 키우게 해서, "매일 하면 이득"이 규칙으로 드러나게 한다.
 * ------------------------------------------------------------------ */

export const OUTCOMES = {
  normal: { label: null, multiplier: 1, statBonus: 0, glow: null },
  great: { label: "순조로웠다", multiplier: 1.5, statBonus: 0, glow: "#4ade80" },
  critical: { label: "대성공", multiplier: 2, statBonus: 1, glow: "#fbbf24" },
} as const;

export type OutcomeKind = keyof typeof OUTCOMES;

const GREAT_CHANCE = 0.2;
const CRIT_BASE = 0.08;
/** 스트릭 하루당 대성공 확률 +1%p. 열흘이면 8% → 18% 로 두 배가 넘는다. */
const CRIT_PER_STREAK = 0.01;
const CRIT_STREAK_CAP = 10;

/** 지금 스트릭에서의 대성공 확률. UI 에 그대로 보여주기 위해 따로 뺐다. */
export function criticalChance(streak: number): number {
  const bounded = Math.max(0, Math.min(streak, CRIT_STREAK_CAP));
  return CRIT_BASE + bounded * CRIT_PER_STREAK;
}

/**
 * 완수 한 번의 결과를 굴린다.
 * random 을 주입받는 이유는 테스트에서 확률을 고정하기 위해서다.
 */
export function rollOutcome(streak: number, random: () => number = Math.random): OutcomeKind {
  const roll = random();
  if (roll < criticalChance(streak)) return "critical";
  if (roll < criticalChance(streak) + GREAT_CHANCE) return "great";
  return "normal";
}

/** 결과를 실제 보상 숫자로 옮긴다. 경험치는 정수로 떨어뜨린다. */
export function applyOutcome(baseExp: number, baseStatGain: number, kind: OutcomeKind) {
  const o = OUTCOMES[kind];
  return {
    exp: Math.round(baseExp * o.multiplier),
    statGain: baseStatGain + o.statBonus,
  };
}
