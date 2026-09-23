import { clearRateLimits } from "@/lib/rate-limit";

// Workers may reuse module state across test files; in-memory rate-limit
// windows must not bleed from one file into the next.
clearRateLimits();
