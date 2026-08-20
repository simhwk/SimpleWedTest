/**
 * "하루"의 기준은 서버가 있는 곳이 아니라 사용자가 사는 곳이어야 한다.
 * 새벽 1시에 손댄 일이 UTC 기준으로 어제가 되면 묵힌 일수가 어긋난다.
 */

export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "Asia/Seoul";

/** 주어진 시각을 앱 기준 타임존의 "YYYY-MM-DD" 로. */
export function dayKey(date: Date = new Date(), timeZone: string = APP_TIMEZONE): string {
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

/**
 * 묵힌 일수 — 이 앱의 유일한 숫자.
 *
 * 등급을 매기지 않는다. 인정을 정확하게 만드는 재료일 뿐 크기를 정하지 않는다.
 * (묵힐수록 크게 쳐주면 미루기를 보상하는 앱이 된다)
 */
export function waitedDays(from: Date, to: Date = new Date()): number {
  return Math.max(0, daysBetween(dayKey(from), dayKey(to)));
}

/** 피드로 내보낼 때는 정확한 숫자를 숨긴다 — 숫자가 나열되면 사용자가 순위를 만든다. */
export function waitedBand(days: number): string {
  if (days <= 2) return "며칠 묵힌 일";
  if (days <= 13) return "한참 묵힌 일";
  return "오래 묵힌 일";
}

/**
 * 손댄 기록들 사이의 간격(일). 이 앱의 진짜 지표 —
 * 완료는 했다·안 했다 둘뿐이라 중간 진전을 못 담는다.
 */
export function touchGaps(createdAt: Date, touches: Date[]): number[] {
  const points = [createdAt, ...touches];
  const gaps: number[] = [];
  for (let i = 1; i < points.length; i += 1) {
    gaps.push(waitedDays(points[i - 1], points[i]));
  }
  return gaps;
}
