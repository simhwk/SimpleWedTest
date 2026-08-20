import { dayKey, daysBetween, touchGaps, waitedBand, waitedDays } from "../src/lib/days.ts";

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass += 1;
  else fail += 1;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `\n    got ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`}`);
};

const d = (s) => new Date(s);

// 날짜 차이
eq("연속된 날", daysBetween("2026-08-18", "2026-08-19"), 1);
eq("월 경계", daysBetween("2026-08-31", "2026-09-01"), 1);
eq("연 경계", daysBetween("2025-12-31", "2026-01-01"), 1);
eq("윤년 2월", daysBetween("2028-02-28", "2028-02-29"), 1);

// 타임존: UTC 새벽은 서울에서 이미 다음 날
eq("서울 기준 날짜", dayKey(d("2026-08-18T16:30:00Z"), "Asia/Seoul"), "2026-08-19");
eq("UTC 기준 날짜", dayKey(d("2026-08-18T16:30:00Z"), "UTC"), "2026-08-18");

// 묵힌 일수
eq("같은 날 올리고 손댐", waitedDays(d("2026-08-20T01:00:00+09:00"), d("2026-08-20T23:00:00+09:00")), 0);
eq("하루 뒤", waitedDays(d("2026-08-19T10:00:00+09:00"), d("2026-08-20T10:00:00+09:00")), 1);
eq("23일 뒤", waitedDays(d("2026-07-28T10:00:00+09:00"), d("2026-08-20T10:00:00+09:00")), 23);
eq("역전 방어", waitedDays(d("2026-08-21T10:00:00+09:00"), d("2026-08-20T10:00:00+09:00")), 0);

// 피드용 범위 — 정확한 숫자를 숨긴다 (숫자가 나열되면 사용자가 순위를 만든다)
eq("며칠", waitedBand(0), "며칠 묵힌 일");
eq("며칠 경계", waitedBand(2), "며칠 묵힌 일");
eq("한참 시작", waitedBand(3), "한참 묵힌 일");
eq("한참 경계", waitedBand(13), "한참 묵힌 일");
eq("오래", waitedBand(14), "오래 묵힌 일");

// 손댄 간격 — 줄어드는 것이 이 앱의 진짜 진전
eq(
  "간격이 좁아진다",
  touchGaps(d("2026-07-28T10:00:00+09:00"), [
    d("2026-08-20T10:00:00+09:00"),
    d("2026-08-22T10:00:00+09:00"),
    d("2026-08-23T10:00:00+09:00"),
  ]),
  [23, 2, 1],
);
eq("한 번도 안 댐", touchGaps(d("2026-08-01T10:00:00+09:00"), []), []);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
