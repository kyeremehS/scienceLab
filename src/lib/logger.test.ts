import { afterEach, describe, expect, it, vi } from "vitest";
import { getRequestId, logError } from "@/lib/logger";

describe("logger (CR-10)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits request id and message without sensitive detail", () => {
    const calls: unknown[][] = [];
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      calls.push(args);
    });
    const error = Object.assign(new Error("auth failed for secret123@example.com token=abc"), {
      code: "23505",
    });
    logError("req-1", "Login failed", error);

    expect(calls).toHaveLength(1);
    const logged = String(calls[0][0]);
    const parsed = JSON.parse(logged) as Record<string, unknown>;
    expect(parsed.level).toBe("error");
    expect(parsed.requestId).toBe("req-1");
    expect(parsed.message).toBe("Login failed");
    expect(logged).not.toContain("secret123");
    expect(logged).not.toContain("token=abc");
    expect(logged).not.toContain("stack");
  });

  it("reads the request id header, generating one as fallback", () => {
    const withHeader = new Request("http://localhost/", {
      headers: { "x-request-id": "abc-123" },
    });
    expect(getRequestId(withHeader)).toBe("abc-123");
    const without = new Request("http://localhost/");
    expect(getRequestId(without)).toMatch(/^[0-9a-f-]{36}$/);
  });
});
