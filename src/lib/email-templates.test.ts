import { describe, expect, it } from "vitest";
import { renderPasswordResetEmail } from "./email-templates";

describe("password reset email", () => {
  it("renders a button CTA plus a plain-link fallback, with matching text part", () => {
    const url = "https://example.com/reset-password?token=abc";
    const { html, text } = renderPasswordResetEmail(url, 60);

    expect(html).toContain("Reset your password");
    expect(html).toContain("SCIENCELAB");
    expect(html).toContain("Learn science by doing.");
    // URL appears 3x in HTML: button href, fallback href, fallback link text.
    expect(html.split(url).length - 1).toBe(3);
    expect(html).toContain("If the button doesn't work");
    expect(text).toContain(`Reset password: ${url}`);
    expect(text).toContain("60 minutes");
  });

  it("escapes injected markup in every field", () => {
    const { html, text } = renderPasswordResetEmail('https://example.com/?x="><script>', 60);
    expect(html).not.toContain("<script>");
    expect(text).toContain('https://example.com/?x="><script>');
  });
});
