/**
 * Shared ScienceLab transactional-email shell (docs/UI_DESIGN.md email rules).
 *
 * Deliberately restrained: light body for client compatibility (email dark-mode
 * rendering is unpredictable), inline styles only, table layout, single CTA
 * button plus a plain-link fallback. Verification templates are omitted —
 * email verification is deferred from the MVP.
 */

export interface EmailContent {
  heading: string;
  intro: string;
  ctaLabel: string;
  ctaUrl: string;
  expiryNote: string;
  ignoreNote: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderScienceLabEmail(content: EmailContent): { html: string; text: string } {
  const heading = escapeHtml(content.heading);
  const intro = escapeHtml(content.intro);
  const expiryNote = escapeHtml(content.expiryNote);
  const ignoreNote = escapeHtml(content.ignoreNote);
  const ctaLabel = escapeHtml(content.ctaLabel);
  const ctaUrl = escapeHtml(content.ctaUrl);

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:0;background-color:#f5f5f4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f4;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #e7e5e4;border-radius:8px;overflow:hidden;">
<tr><td style="padding:20px 28px;border-bottom:1px solid #e7e5e4;">
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:2px;color:#171717;">SCIENCELAB</p>
</td></tr>
<tr><td style="padding:28px;">
<h1 style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:20px;color:#171717;">${heading}</h1>
<p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#525252;">${intro}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="#20c9c3" style="border-radius:8px;">
<a href="${ctaUrl}" style="display:inline-block;padding:12px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#083f3c;text-decoration:none;">${ctaLabel}</a>
</td></tr></table>
<p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#525252;">${expiryNote}</p>
<p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#525252;">${ignoreNote}</p>
<p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#737373;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${ctaUrl}" style="color:#0b6e6a;word-break:break-all;">${ctaUrl}</a></p>
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e7e5e4;">
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#737373;">ScienceLab<br>Learn science by doing.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    content.heading,
    "",
    content.intro,
    "",
    `${content.ctaLabel}: ${content.ctaUrl}`,
    "",
    content.expiryNote,
    "",
    content.ignoreNote,
  ].join("\n");

  return { html, text };
}

export function renderPasswordResetEmail(resetUrl: string, expiresMinutes: number): {
  html: string;
  text: string;
} {
  return renderScienceLabEmail({
    heading: "Reset your password",
    intro: "We received a request to reset your ScienceLab password.",
    ctaLabel: "Reset password",
    ctaUrl: resetUrl,
    expiryNote: `This link expires in ${expiresMinutes} minutes and can only be used once.`,
    ignoreNote: "If you didn't request a password reset, you can safely ignore this email.",
  });
}
