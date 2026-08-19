import { NextResponse } from "next/server";
import { z } from "zod";

import { createSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "이메일과 비밀번호를 확인해주세요." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.trim().toLowerCase() },
  });

  // 이메일이 없는 경우와 비밀번호가 틀린 경우를 같은 메시지로 묶는다 — 계정 존재 여부를 흘리지 않기 위해.
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "이메일 또는 비밀번호가 맞지 않아요." }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
