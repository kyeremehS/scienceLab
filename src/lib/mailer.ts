import nodemailer from "nodemailer";
import { renderPasswordResetEmail } from "./email-templates";

/**
 * Mail channel abstraction (FR-AUTH-01).
 *
 * Providers:
 * - `smtp` (default): delivers through the configured SMTP host.
 *   Development default is Mailpit at localhost:1025 via docker compose
 *   (trapped locally, never delivered). Production uses a real relay
 *   such as Brevo (`smtp-relay.brevo.com:587`) via SMTP_HOST, SMTP_PORT,
 *   SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM — see README deployment.
 * - `console`: logs the reset link server-side (no SMTP available).
 */
export interface ResetMail {
  to: string;
  resetUrl: string;
  expiresMinutes: number;
}

export async function sendPasswordResetMail(mail: ResetMail): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER ?? "smtp";
  const { html, text } = renderPasswordResetEmail(mail.resetUrl, mail.expiresMinutes);
  if (provider === "console") {
    console.log(
      `[auth] password reset for ${mail.to} (valid ${mail.expiresMinutes} min): ${mail.resetUrl}`,
    );
    return;
  }
  if (provider === "smtp") {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "localhost",
      port: Number(process.env.SMTP_PORT ?? 1025),
      // Brevo and similar relays require STARTTLS + login; local Mailpit
      // needs neither, so auth/TLS apply only when credentials are set.
      ...(user && pass ? { auth: { user, pass }, requireTLS: true } : {}),
    });
    await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? "ScienceLab <no-reply@sciencelab.local>",
      to: mail.to,
      subject: "Reset your ScienceLab password",
      text,
      html,
    });
    return;
  }
  throw new Error(`Unknown EMAIL_PROVIDER: ${provider}`);
}

export function buildResetUrl(req: Request, token: string): string {
  return `${new URL(req.url).origin}/reset-password?token=${token}`;
}
