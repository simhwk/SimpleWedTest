import "server-only";

import nodemailer from "nodemailer";

import { prisma } from "@/lib/db";

/**
 * SMTP 설정이 다 있을 때만 실제로 메일을 쏜다.
 * 없으면 콘솔에 찍고 MailLog 에만 남긴다 — 개발 중에 계정 없이도 흐름을 볼 수 있게.
 */
function smtpConfig() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  const port = Number(SMTP_PORT ?? 587);
  return {
    host: SMTP_HOST,
    port,
    secure: port === 465, // 465 는 암묵적 TLS, 587 은 STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  };
}

export function mailEnabled(): boolean {
  return smtpConfig() !== null;
}

export type SendResult = { delivered: boolean; provider: "smtp" | "console"; error?: string };

export async function sendMail(opts: {
  to: string;
  subject: string;
  body: string;
}): Promise<SendResult> {
  const config = smtpConfig();

  if (!config) {
    console.log(`\n[mail:console] to=${opts.to}\n제목: ${opts.subject}\n---\n${opts.body}\n`);
    await logMail({ ...opts, provider: "console" });
    return { delivered: false, provider: "console" };
  }

  try {
    const transport = nodemailer.createTransport(config);
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? config.auth.user,
      to: opts.to,
      subject: opts.subject,
      text: opts.body,
      html: renderHtml(opts.subject, opts.body),
    });

    await logMail({ ...opts, provider: "smtp" });
    return { delivered: true, provider: "smtp" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[mail] 발송 실패:", message);
    await logMail({ ...opts, provider: "smtp", error: message });
    return { delivered: false, provider: "smtp", error: message };
  }
}

function logMail(entry: {
  to: string;
  subject: string;
  body: string;
  provider: string;
  error?: string;
}) {
  return prisma.mailLog.create({ data: entry }).catch((e) => {
    console.error("[mail] 로그 저장 실패:", e);
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 메일함에서도 앱 분위기가 나도록 최소한의 스타일만 입힌다. */
function renderHtml(subject: string, body: string): string {
  return `<div style="background:#0b0d17;padding:32px 16px;font-family:'Pretendard',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#141829;border:1px solid #262b45;border-radius:20px;padding:32px">
    <div style="font-size:12px;letter-spacing:.18em;color:#7c83a3;text-transform:uppercase">내 인생 RPG</div>
    <h1 style="margin:12px 0 24px;font-size:22px;color:#f0f2ff">${escapeHtml(subject)}</h1>
    <div style="white-space:pre-wrap;line-height:1.75;font-size:15px;color:#c3c8e0">${escapeHtml(body)}</div>
  </div>
</div>`;
}
