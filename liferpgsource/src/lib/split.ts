import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

/**
 * 쪼개기 — 이 앱에서 AI 가 하는 진짜 일.
 *
 * 이전 앱에서 AI 는 "설거지"를 "쌓인 그릇 산맥의 정화"로 바꾸는 장식이었고,
 * 그래서 규칙 기반 폴백으로 대체할 수 있었다. 쪼개기는 대체할 수 없다 —
 * "세금 서류 제출"을 의미 있는 조각으로 나누려면 그게 뭔지 이해해야 하기 때문이다.
 */

const MODEL = "claude-opus-5";

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function client() {
  return new Anthropic();
}

const StepSchema = z.object({
  step: z
    .string()
    .describe(
      "지금 당장 5분 안에 끝낼 수 있는 행동 하나. 한국어 한 문장. " +
        "준비 동작이어도 좋다 — 오히려 그쪽이 낫다. 여러 개를 나열하지 말 것.",
    ),
});

const SYSTEM = `너는 미루는 사람이 첫 발을 떼도록 돕는다.

사람이 일을 미루는 이유는 게을러서가 아니라, 그 일이 통째로 보이면 예상되는 고통이
예상되는 보상보다 크기 때문이다. 네 일은 그 고통을 쪼개서 낮추는 것이다.

규칙:
- 조각은 딱 하나만 준다. 계획표를 주지 마라. 계획을 세우는 것 자체가 또 다른 부담이다.
- 5분 안에 끝나야 한다. 우습게 작아도 된다. 작을수록 좋다.
- "시작"에 해당하는 것을 골라라. 완료가 아니라 착수다.
  예) "세금 서류 제출" → "서류 담을 폴더 하나 만들기"
- 물리적으로 즉시 할 수 있어야 한다. "생각해보기", "계획 세우기" 같은 건 안 된다.
- 훈계하지 마라. 격려하지 마라. 조각만 건네라.
- 한국어로, 명령형이 아닌 담백한 서술로.`;

/**
 * 첫 조각, 또는 「이것도 버거워」를 눌렀을 때 더 작은 조각.
 * depth 가 클수록 더 잘게 쪼갠다.
 */
export async function splitTask(input: {
  title: string;
  waitedDays: number;
  depth: number;
  previous?: string;
}): Promise<string> {
  if (!aiEnabled()) return fallbackStep(input);

  const ask =
    input.depth === 0
      ? `미루고 있는 일: ${input.title}\n올려둔 지 ${input.waitedDays}일 지났다.`
      : `미루고 있는 일: ${input.title}\n` +
        `아까 "${input.previous}" 를 제안했는데 이것도 버겁다고 한다.\n` +
        `${input.depth}번째 요청이다. 훨씬 더 작게 쪼개라.`;

  try {
    const response = await client().messages.parse({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      output_config: { effort: "medium", format: zodOutputFormat(StepSchema) },
      messages: [{ role: "user", content: ask }],
    });
    return response.parsed_output?.step ?? fallbackStep(input);
  } catch (error) {
    console.error("[split] 실패, 폴백 사용:", error);
    return fallbackStep(input);
  }
}

/**
 * 키가 없을 때의 임시 조각.
 *
 * 이건 제품이 아니라 흐름을 눌러보기 위한 자리표시다. 진짜 쪼개기는 AI 만 할 수 있고,
 * 이 폴백으로는 앱의 핵심 가치를 검증할 수 없다.
 */
function fallbackStep(input: { title: string; depth: number }): string {
  const ladder = [
    `«${input.title}» 에 필요한 것 하나만 꺼내두기`,
    `그 일이 놓인 자리에 5분만 앉아 있기`,
    `필요한 걸 딱 하나만 손에 쥐기`,
  ];
  return ladder[Math.min(input.depth, ladder.length - 1)];
}
