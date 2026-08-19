import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import {
  RANKS,
  RANK_KEYS,
  STATS,
  STAT_KEYS,
  withParticle,
  type RankKey,
  type StatKey,
} from "@/lib/game";

const MODEL = "claude-opus-5";

/** 키가 없으면 AI 호출을 건너뛰고 폴백을 쓴다. 처음 켜자마자 앱이 동작하도록. */
export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function client() {
  return new Anthropic();
}

const QuestSchema = z.object({
  title: z.string().describe("판타지 게임 퀘스트 이름. 한국어 8~20자. 원래 할 일이 뭔지 알아볼 수 있어야 한다."),
  story: z.string().describe("퀘스트 설명 한두 문장. 게임 NPC가 의뢰를 건네는 말투. 한국어."),
  rank: z.enum(RANK_KEYS as [RankKey, ...RankKey[]]).describe("일의 무게에 맞는 난이도 등급"),
  stat: z.enum(STAT_KEYS as [StatKey, ...StatKey[]]).describe("이 일을 하면 올라갈 능력치"),
});

export type GeneratedQuest = z.infer<typeof QuestSchema>;

const SYSTEM_PROMPT = `너는 "내 인생 RPG"라는 앱의 퀘스트 마스터다.
사용자가 오늘 해야 할 평범한 일을 한 줄 적으면, 그걸 판타지 RPG 퀘스트로 바꿔준다.

말투와 톤:
- 10~20대가 보고 피식 웃을 정도로 과장되게, 하지만 유치하지 않게.
- 설거지 같은 사소한 일도 세계를 구하는 것처럼 비장하게 포장한다.
- 반말이 아니라 의뢰서 같은 문어체를 쓴다.

난이도 등급 기준:
${RANK_KEYS.map((r) => `- ${r}: ${RANKS[r].desc}`).join("\n")}

능력치 배정 기준:
${STAT_KEYS.map((s) => `- ${s}(${STATS[s].label}): ${STATS[s].desc}`).join("\n")}

사용자가 적은 일이 실제로 어느 정도 무게인지 냉정하게 판단해라.
"물 한 잔 마시기"에 A급을 주면 게임이 망가진다.`;

/** 할 일 한 줄 → 퀘스트. 실패하거나 키가 없으면 폴백으로 떨어진다. */
export async function generateQuest(rawInput: string): Promise<GeneratedQuest> {
  if (!aiEnabled()) return fallbackQuest(rawInput);

  try {
    const response = await client().messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      output_config: {
        effort: "low",
        format: zodOutputFormat(QuestSchema),
      },
      messages: [{ role: "user", content: `오늘 해야 할 일: ${rawInput}` }],
    });

    return response.parsed_output ?? fallbackQuest(rawInput);
  } catch (error) {
    console.error("[ai] 퀘스트 생성 실패, 폴백 사용:", error);
    return fallbackQuest(rawInput);
  }
}

/**
 * AI 없이 돌리는 규칙 기반 생성기.
 * 키워드 매칭 점수가 가장 높은 능력치를 고르고, 글자 수 + 무게감 키워드로 등급을 잡는다.
 * AI 결과만큼 재치있진 않지만, 키 없이도 앱이 온전히 돌아가게 하는 게 목적이다.
 */
const KEYWORD_STATS: Record<StatKey, string[]> = {
  strength: ["운동", "헬스", "달리", "러닝", "조깅", "산책", "스쿼트", "등산", "수영", "짐 ", "옮기", "청소", "빨래", "설거지"],
  intellect: ["공부", "과제", "코딩", "개발", "책", "독서", "강의", "시험", "복습", "예습", "논문", "외우", "단어", "영어", "토익", "자격증", "인강", "필기"],
  charm: ["연락", "약속", "만나", "전화", "답장", "선물", "생일", "데이트", "모임", "인사", "카톡", "축하", "소개팅", "친구"],
  vitality: ["잠", "수면", "밥", "식사", "물", "병원", "약 ", "휴식", "스트레칭", "샤워", "일찍 자", "챙겨 먹", "건강"],
  will: ["미룬", "미루", "밀린", "드디어", "귀찮", "결심", "끊기", "습관", "정산", "세금", "서류", "제출", "신청", "환불", "취소", "정리"],
};

/** 이 단어가 들어가면 일이 무거워진다 — 등급을 한 칸 올린다. */
const HEAVY_WORDS = ["시험", "면접", "발표", "이사", "논문", "세금", "제출", "마감", "포트폴리오", "자격증", "지원서"];

function fallbackQuest(rawInput: string): GeneratedQuest {
  const text = rawInput.trim();

  // 첫 매칭이 아니라 매칭 개수로 고른다. "세금 서류 정리"에서 '정리'만 보고 힘으로 새지 않게.
  const scored = STAT_KEYS.map((key) => ({
    key,
    score: KEYWORD_STATS[key].filter((w) => text.includes(w)).length,
  }));
  const best = scored.reduce((a, b) => (b.score > a.score ? b : a));
  const stat: StatKey = best.score > 0 ? best.key : "will";

  // 길게 쓴 일일수록 무겁다고 가정하고, 무게감 키워드가 있으면 한 칸 올린다.
  const baseIndex = text.length <= 6 ? 0 : text.length <= 12 ? 1 : text.length <= 22 ? 2 : 3;
  const bump = HEAVY_WORDS.some((w) => text.includes(w)) ? 1 : 0;
  const rank = RANK_KEYS[Math.min(baseIndex + bump, RANK_KEYS.length - 1)];

  return {
    title: buildFallbackTitle(text, stat),
    story: `길드에 접수된 의뢰다. 완수하면 ${withParticle(STATS[stat].label, "이", "가")} 오른다.`,
    rank,
    stat,
  };
}

/** 능력치별로 말투를 조금씩 달리해 폴백 퀘스트도 게임처럼 보이게 한다. */
const TITLE_TEMPLATES: Record<StatKey, string> = {
  strength: "«{}» 단련의 시련",
  intellect: "«{}» 지식의 탐구",
  charm: "«{}» 인연의 의뢰",
  vitality: "«{}» 회복의 의식",
  will: "«{}» 미루던 자의 결단",
};

function buildFallbackTitle(text: string, stat: StatKey): string {
  return TITLE_TEMPLATES[stat].replace("{}", text);
}

/** 주간 리포트 메일 본문. 실패 시 담백한 기본 문구로 대체된다. */
export async function generateWeeklyReport(input: {
  nickname: string;
  level: number;
  title: string;
  completed: { title: string; rank: string }[];
  pending: { title: string }[];
  expGained: number;
  streak: number;
  bestStreak: number;
  achievements: string[];
}): Promise<string> {
  const fallback = defaultReport(input);
  if (!aiEnabled()) return fallback;

  try {
    const response = await client().messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: `너는 "내 인생 RPG"의 길드 서기다. 모험가에게 지난 7일 활동 보고서를 편지로 써 보낸다.
- 한국어, 300자 안팎, 문단 2~3개.
- 판타지 길드 보고서 말투지만 읽는 사람이 실제로 기분 좋아지게 쓴다.
- 못 깬 퀘스트가 있어도 혼내지 말고 다음 주에 자연스럽게 권한다.
- 연속 달성(스트릭)이 이어지고 있으면 꼭 짚어주고, 끊겼으면 가볍게 다시 시작하자고 한다.
- 이번 주에 딴 업적이 있으면 축하해준다.
- 마크다운 없이 평문으로만 쓴다.`,
      messages: [
        {
          role: "user",
          content: JSON.stringify(input, null, 2),
        },
      ],
      output_config: { effort: "low" },
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return text || fallback;
  } catch (error) {
    console.error("[ai] 리포트 생성 실패, 폴백 사용:", error);
    return fallback;
  }
}

function defaultReport(input: {
  nickname: string;
  level: number;
  title: string;
  completed: { title: string }[];
  pending: { title: string }[];
  expGained: number;
  streak: number;
  bestStreak: number;
  achievements: string[];
}): string {
  const lines = [
    `${input.nickname} 님, 지난 7일 활동 보고서입니다.`,
    ``,
    `현재 Lv.${input.level} — ${input.title}`,
    `이번 주에 얻은 경험치: ${input.expGained} EXP`,
    input.streak > 0
      ? `연속 달성: ${input.streak}일째 (최고 ${input.bestStreak}일)`
      : `연속 달성: 끊김 (최고 ${input.bestStreak}일)`,
  ];

  lines.push(``, `완수한 퀘스트: ${input.completed.length}건`);
  if (input.completed.length) {
    // 다 나열하면 메일이 끝없이 길어진다. 최근 것만 보여주고 나머지는 숫자로 접는다.
    lines.push(...input.completed.slice(0, 8).map((q) => `  · ${q.title}`));
    const rest = input.completed.length - 8;
    if (rest > 0) lines.push(`  · … 외 ${rest}건`);
  }

  if (input.achievements.length) {
    lines.push(``, `이번 주에 딴 업적`);
    lines.push(...input.achievements.map((a) => `  · ${a}`));
  }

  if (input.pending.length) {
    lines.push(``, `아직 수락 중인 퀘스트: ${input.pending.length}건`);
    lines.push(...input.pending.map((q) => `  · ${q.title}`));
  }

  lines.push(``, `다음 주에도 기다리고 있겠습니다.`);
  return lines.join("\n");
}
