import { STAT_KEYS, type StatKey } from "@/lib/game";

/**
 * 오늘의 의뢰 게시판.
 *
 * 이 앱은 원래 사용자가 할 일을 먼저 적어야만 아무 일도 일어나지 않았다.
 * 빈 입력창은 "오늘 뭐 하지"를 사용자에게 통째로 떠넘긴다.
 * 그래서 앱이 먼저 몇 개를 내밀고, 마음에 들면 누르기만 하면 되게 한다.
 *
 * 제안은 저장하지 않는다. (유저, 날짜) 로 시드를 만들어 그때그때 계산하므로
 * 같은 날 새로고침하면 같은 목록이 나오고, 날이 바뀌면 갈린다.
 * 테이블이 늘지 않으니 마이그레이션도 필요 없다.
 */

/** 능력치별 후보. 길이를 일부러 섞어 뒀다 — 등급이 글자 수에 좌우되기 때문. */
const CATALOG: Record<StatKey, string[]> = {
  strength: [
    "스트레칭 10분",
    "계단으로 올라가기",
    "30분 걷기",
    "팔굽혀펴기 20개",
    "가까운 거리 걸어가기",
    "방 정리하고 청소기 돌리기",
    "밀린 빨래 돌리고 널기",
  ],
  intellect: [
    "책 10쪽 읽기",
    "영어 단어 20개 외우기",
    "안 보던 분야 글 하나 읽기",
    "오늘 배운 것 세 줄로 적기",
    "듣다 만 강의 한 편 마저 듣기",
    "코드 한 조각 직접 짜보기",
  ],
  charm: [
    "고마운 사람에게 연락하기",
    "안 읽은 메시지 답장하기",
    "가족에게 전화 한 통",
    "친구 안부 묻기",
    "오래 미룬 약속 날짜 잡기",
  ],
  vitality: [
    "물 한 잔 마시기",
    "30분 일찍 자기",
    "제때 밥 챙겨 먹기",
    "낮에 햇빛 보기",
    "자기 전 휴대폰 내려놓기",
    "미룬 병원 예약 잡기",
  ],
  will: [
    "5분만 손대보기",
    "책상 위 치우기",
    "안 쓰는 구독 하나 끊기",
    "미루던 서류 제출하기",
    "밀린 정산 정리해서 마무리하기",
  ],
};

/** 문자열 → 32비트 정수. 시드를 만들기 위한 최소한의 해시. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 시드에서 0~1 난수를 뽑는 생성기 (mulberry32). */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Suggestion = { text: string; stat: StatKey };

/**
 * 오늘 내밀 의뢰들. 능력치가 겹치지 않게 서로 다른 칸에서 하나씩 뽑는다 —
 * 세 개가 전부 운동이면 고르는 재미가 없다.
 */
export function dailyBoard(userId: string, day: string, count = 3): Suggestion[] {
  const next = rng(hash(`${userId}:${day}`));

  // 능력치 순서를 섞고 앞에서부터 count 개를 쓴다 (Fisher-Yates).
  const stats = [...STAT_KEYS];
  for (let i = stats.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [stats[i], stats[j]] = [stats[j], stats[i]];
  }

  return stats.slice(0, Math.min(count, stats.length)).map((stat) => {
    const pool = CATALOG[stat];
    return { text: pool[Math.floor(next() * pool.length)], stat };
  });
}
