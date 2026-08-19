import { advanceStreak, daysBetween, dayKey, displayStreak } from "../src/lib/streak.ts";

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass += 1;
  else fail += 1;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `\n    got ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`}`);
};

// 날짜 차이
eq("연속된 날", daysBetween("2026-08-18", "2026-08-19"), 1);
eq("월 경계", daysBetween("2026-08-31", "2026-09-01"), 1);
eq("연 경계", daysBetween("2025-12-31", "2026-01-01"), 1);
eq("윤년 2월", daysBetween("2028-02-28", "2028-02-29"), 1);
eq("사흘 공백", daysBetween("2026-08-16", "2026-08-19"), 3);

// 스트릭 진행
const base = { streak: 0, bestStreak: 0, lastClearDay: null };
eq("첫 달성", advanceStreak(base, "2026-08-19"),
   { streak: 1, bestStreak: 1, lastClearDay: "2026-08-19", extended: true });

eq("같은 날 두 번째 — 안 늘어남",
   advanceStreak({ streak: 3, bestStreak: 5, lastClearDay: "2026-08-19" }, "2026-08-19"),
   { streak: 3, bestStreak: 5, lastClearDay: "2026-08-19", extended: false });

eq("어제 이어서 +1",
   advanceStreak({ streak: 3, bestStreak: 5, lastClearDay: "2026-08-18" }, "2026-08-19"),
   { streak: 4, bestStreak: 5, lastClearDay: "2026-08-19", extended: true });

eq("최고 기록 갱신",
   advanceStreak({ streak: 5, bestStreak: 5, lastClearDay: "2026-08-18" }, "2026-08-19"),
   { streak: 6, bestStreak: 6, lastClearDay: "2026-08-19", extended: true });

eq("하루 빠짐 — 1부터 다시",
   advanceStreak({ streak: 9, bestStreak: 9, lastClearDay: "2026-08-17" }, "2026-08-19"),
   { streak: 1, bestStreak: 9, lastClearDay: "2026-08-19", extended: true });

eq("월 넘어가며 이어짐",
   advanceStreak({ streak: 2, bestStreak: 2, lastClearDay: "2026-08-31" }, "2026-09-01"),
   { streak: 3, bestStreak: 3, lastClearDay: "2026-09-01", extended: true });

// 표시용 스트릭
eq("오늘 깬 상태", displayStreak({ streak: 4, bestStreak: 4, lastClearDay: "2026-08-19" }, "2026-08-19"), 4);
eq("어제까지 — 아직 유효", displayStreak({ streak: 4, bestStreak: 4, lastClearDay: "2026-08-18" }, "2026-08-19"), 4);
eq("이틀 전 — 끊김", displayStreak({ streak: 4, bestStreak: 4, lastClearDay: "2026-08-17" }, "2026-08-19"), 0);
eq("기록 없음", displayStreak({ streak: 0, bestStreak: 0, lastClearDay: null }, "2026-08-19"), 0);

// 타임존: UTC 새벽은 서울에서 이미 다음 날
eq("서울 기준 날짜", dayKey(new Date("2026-08-18T16:30:00Z"), "Asia/Seoul"), "2026-08-19");
eq("UTC 기준 날짜", dayKey(new Date("2026-08-18T16:30:00Z"), "UTC"), "2026-08-18");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
