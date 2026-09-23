export const REQUEST_ID_HEADER = "x-request-id";

/** Correlation id for the current request (set by middleware; generated as fallback). */
export function getRequestId(req: Request): string {
  // Web Crypto global: available in Node, Edge Runtime, and browsers.
  return req.headers.get(REQUEST_ID_HEADER) ?? crypto.randomUUID();
}

/** Scrubbed one-line detail: error name/code only, never payloads or stacks. */
function errorDetail(error: unknown): string | undefined {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    const base = typeof code === "string" ? `${error.name}(${code})` : error.name;
    // Cap length; messages may echo query fragments or user input.
    return base.slice(0, 200);
  }
  return undefined;
}

/**
 * Structured server error log (CR-10). Static message plus a request id;
 * never passwords, hashes, tokens, session secrets, or personal data —
 * callers must not interpolate user input into `message`.
 */
export function logError(requestId: string, message: string, error?: unknown): void {
  console.error(
    JSON.stringify({
      level: "error",
      requestId,
      message,
      detail: error === undefined ? undefined : errorDetail(error),
    }),
  );
}
