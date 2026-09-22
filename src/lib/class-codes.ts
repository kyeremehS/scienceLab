import { randomInt } from "node:crypto";

// 6-character Crockford base32 (no I/L/O/U): readable, shareable by voice or
// board. ~160M combinations; collisions retried on insert (FR-TEA-09).
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export const CLASS_CODE_LENGTH = 6;

export function generateClassCode(): string {
  let code = "";
  for (let i = 0; i < CLASS_CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}
