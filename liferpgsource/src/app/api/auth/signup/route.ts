import { NextResponse } from "next/server";
import { z } from "zod";

import { createSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

const Body = z.object({
  email: z.email("이메일 형식을 확인해주세요."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 해요."),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();

  if (await prisma.user.findUnique({ where: { email } })) {
    return NextResponse.json({ error: "이미 가입된 이메일이에요." }, { status: 409 });
  }

  // 표시 이름을 받지 않는다. 이 앱에서 남에게 보이는 이름은 언제나 "누군가" 다.
  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword(parsed.data.password) },
  });

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
