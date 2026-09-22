import nodemailer from "nodemailer";
import { renderPasswordResetEmail } from "./email-templates";

/**
 * Mail channel abstraction (FR-AUTH-01).
 *
 * Providers:
 * - `smtp` (default in development): delivers to the configured SMTP host —
 *   Mailpit at localhost:1025 via docker compose. Trapped locally, never
 *   delivered. This is the dev default so the recovery flow is testable
 *   end-to-end like a real user.
 * - `console`: logs the reset link server-side (no SMTP available).
 *
 * A real delivery provider is plugged in here before any pilot; the
 * forgot/reset flow itself does not change.
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
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "localhost",
      port: Number(process.env.SMTP_PORT ?? 1025),
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
