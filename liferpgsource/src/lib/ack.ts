import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

/**
 * 인정 — 사용자가 이 앱에서 실제로 받아가는 것.
 *
 * 이전 앱의 실패는 보상이 작아서가 아니라 노력과 무관해서였다.
 * 힘든 일도 +30, 쉬운 일도 +30이면 어떤 숫자를 줘도 인정으로 읽히지 않는다.
 */

const MODEL = "claude-opus-5";

function client() {
  return new Anthropic();
}

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const AckSchema = z.object({
  text: z.string().describe("두 문장 이내의 인정. 한국어."),
});

const SYSTEM = `너는 미루던 일에 방금 손을 댄 사람에게 한마디를 건넨다.

이 사람은 이미 스스로를 충분히 탓하고 있다. 네가 거들 필요는 없다.
사실을 짚어주기만 해라. 그 사실이 곧 인정이다.

금지:
- 과장하지 마라. 작은 일을 큰일처럼 부풀리면 비웃음으로 읽힌다.
- 훈계하지 마라. 다음에 뭘 하라고 시키지 마라.
- "드디어" 라고 쓰지 마라. 인정이 아니라 나무람이 된다.
- "벌써", "아직도" 도 마찬가지다.
- 묵힌 날이 길다고 더 크게 칭찬하지 마라. 3일이든 30일이든 온전한 인정을 준다.
  날수는 문장을 정확하게 만드는 재료일 뿐 점수가 아니다.
- 이모지를 쓰지 마라.

두 문장 이내. 담백하게. 한국어로.`;

export async function acknowledge(input: {
  title: string;
  waitedDays: number;
  splitCount: number;
  touchCount: number;
}): Promise<string> {
  if (!aiEnabled()) return fallbackAck(input);

  const facts = [
    `일: ${input.title}`,
    `올려둔 지 ${input.waitedDays}일 만에 손을 댔다.`,
    input.splitCount > 0
      ? `더 작게 쪼개달라고 ${input.splitCount}번 눌렀다.`
      : `한 번에 시작했다.`,
    input.touchCount > 1 ? `이 일에 손댄 건 ${input.touchCount}번째다.` : `처음 손댄 것이다.`,
  ].join("\n");

  try {
    const response = await client().messages.parse({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(AckSchema) },
      messages: [{ role: "user", content: facts }],
    });
    return response.parsed_output?.text ?? fallbackAck(input);
  } catch (error) {
    console.error("[ack] 실패, 폴백 사용:", error);
    return fallbackAck(input);
  }
}

/** 키가 없을 때. 사실만 나열한다 — 규칙으로 쓸 수 있는 건 여기까지다. */
function fallbackAck(input: { waitedDays: number; splitCount: number }): string {
  const days =
    input.waitedDays === 0 ? "올려둔 날 바로" : `${input.waitedDays}일 만에`;
  const split =
    input.splitCount > 0 ? ` ${input.splitCount}번 더 쪼개고 나서였습니다.` : "";
  return `${days} 이 일에 손을 댔습니다.${split}`;
}
