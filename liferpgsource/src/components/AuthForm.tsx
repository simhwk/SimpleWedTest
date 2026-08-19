"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Mode = "login" | "signup";

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === "signup";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      ...(isSignup ? { nickname: String(form.get("nickname") ?? "") } : {}),
    };

    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);

    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setError(data?.error ?? "잠시 후 다시 시도해주세요.");
      setPending(false);
      return;
    }

    // 서버 컴포넌트가 새 쿠키를 읽도록 refresh 를 함께 호출한다.
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm animate-rise">
      <Link href="/" className="mb-8 block text-center text-xs tracking-[0.3em] text-muted hover:text-text">
        내 인생 RPG
      </Link>

      <div className="rounded-3xl border border-line bg-panel/80 p-7 backdrop-blur">
        <h1 className="text-xl">{isSignup ? "모험가 등록" : "다시 오셨군요"}</h1>
        <p className="mt-2 text-sm text-muted">
          {isSignup ? "캐릭터를 만들고 첫 퀘스트를 받으세요." : "기록해둔 퀘스트가 기다리고 있어요."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {isSignup && (
            <Field
              label="닉네임"
              name="nickname"
              type="text"
              placeholder="모험가 이름"
              maxLength={20}
              required
            />
          )}
          <Field label="이메일" name="email" type="email" placeholder="you@example.com" required />
          <Field
            label="비밀번호"
            name="password"
            type="password"
            placeholder={isSignup ? "8자 이상" : "비밀번호"}
            minLength={isSignup ? 8 : undefined}
            required
          />

          {error && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-gradient-to-r from-accent to-accent-2 px-4 py-3 font-medium text-[#0a0b14] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "잠시만요…" : isSignup ? "모험 시작하기" : "로그인"}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-muted">
        {isSignup ? "이미 계정이 있나요? " : "아직 계정이 없나요? "}
        <Link href={isSignup ? "/login" : "/signup"} className="text-accent-2 hover:underline">
          {isSignup ? "로그인" : "회원가입"}
        </Link>
      </p>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-muted">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl border border-line bg-bg-soft px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted/50 focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
      />
    </label>
  );
}
