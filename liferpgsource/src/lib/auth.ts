import "server-only";

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

import { prisma } from "@/lib/db";

const COOKIE_NAME = "liferpg_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30일

/**
 * 세션 서명 키. 운영에서는 반드시 SESSION_SECRET 을 넣어야 한다.
 * 없으면 개발용 고정 키로 떨어지되, 프로덕션에서는 아예 막는다.
 */
function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET 환경변수가 필요합니다.");
    }
    return new TextEncoder().encode("dev-only-insecure-secret-change-me");
  }
  return new TextEncoder().encode(secret);
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** 로그인 성공 시 호출. httpOnly 쿠키라 JS 로는 못 읽는다. */
export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

async function currentUserId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    // 만료됐거나 위조된 토큰 — 그냥 비로그인으로 취급한다.
    return null;
  }
}

/** 로그인한 유저와 캐릭터를 함께 가져온다. 비로그인이면 null. */
export async function getCurrentUser() {
  const userId = await currentUserId();
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    include: { character: true },
  });
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
