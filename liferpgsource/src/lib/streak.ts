/**
 * 스트릭(연속 달성) 계산.
 *
 * "하루"의 기준은 서버가 있는 곳이 아니라 사용자가 사는 곳이어야 한다.
 * 새벽 1시에 퀘스트를 깼는데 UTC 기준으로 어제가 되면 스트릭이 이상해지므로,
 * 타임존을 명시해서 날짜 키를 만든다.
 */

export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "Asia/Seoul";

/** 주어진 시각을 앱 기준 타임존의 "YYYY-MM-DD" 로 바꾼다. */
export function dayKey(date: Date = new Date(), timeZone: string = APP_TIMEZONE): string {
  // en-CA 로케일이 YYYY-MM-DD 형식을 그대로 준다.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** "YYYY-MM-DD" 두 개가 며칠 차이인지. b 가 나중일 때 양수. */
export function daysBetween(a: string, b: string): number {
  const toUtc = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

export type StreakState = { streak: number; bestStreak: number; lastClearDay: string | null };

/**
 * 퀘스트를 하나 깼을 때의 새 스트릭 상태.
 * - 오늘 이미 깼으면 그대로 (하루에 여러 개 깨도 1일로 친다)
 * - 어제 깼으면 +1
 * - 그보다 오래됐거나 처음이면 1부터 다시
 */
export function advanceStreak(current: StreakState, today: string = dayKey()): StreakState & { extended: boolean } {
  const { lastClearDay } = current;

  if (lastClearDay === today) {
    return { ...current, extended: false };
  }

  const gap = lastClearDay ? daysBetween(lastClearDay, today) : null;
  const streak = gap === 1 ? current.streak + 1 : 1;

  return {
    streak,
    bestStreak: Math.max(current.bestStreak, streak),
    lastClearDay: today,
    extended: true,
  };
}

/**
 * 화면에 보여줄 스트릭. 마지막 달성이 오늘도 어제도 아니면 이미 끊긴 것이므로 0 으로 본다.
 * (끊긴 스트릭을 DB 에 미리 0 으로 적어두지 않는 이유는, 접속하지 않은 유저를 건드리지 않기 위해서다.)
 */
export function displayStreak(state: StreakState, today: string = dayKey()): number {
  if (!state.lastClearDay) return 0;
  const gap = daysBetween(state.lastClearDay, today);
  return gap <= 1 ? state.streak : 0;
}
