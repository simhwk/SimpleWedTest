import { NextResponse } from "next/server";
import { z } from "zod";

import { createSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { titleForLevel } from "@/lib/game";

const Body = z.object({
  email: z.string().email("이메일 형식이 올바르지 않아요."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 해요."),
  nickname: z.string().min(1, "닉네임을 입력해주세요.").max(20, "닉네임은 20자까지예요."),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { email, password, nickname } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  if (await prisma.user.findUnique({ where: { email: normalizedEmail } })) {
    return NextResponse.json({ error: "이미 가입된 이메일이에요." }, { status: 409 });
  }

  // 가입과 동시에 Lv.1 캐릭터를 만들어준다. 캐릭터 없는 유저는 존재하지 않는다.
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash: await hashPassword(password),
      nickname: nickname.trim(),
      character: { create: { title: titleForLevel(1) } },
    },
  });

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
