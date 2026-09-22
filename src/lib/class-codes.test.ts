import { describe, expect, it } from "vitest";
import { CLASS_CODE_LENGTH, generateClassCode } from "./class-codes";

// FR-TEA-09: system-generated, shareable join codes.
describe("generateClassCode", () => {
  it("produces 6-character codes from the unambiguous alphabet", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateClassCode();
      expect(code).toHaveLength(CLASS_CODE_LENGTH);
      expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]+$/);
      expect(code).not.toMatch(/[ILOU]/);
    }
  });

  it("produces unique codes across a batch", () => {
    const codes = new Set(Array.from({ length: 1000 }, generateClassCode));
    expect(codes.size).toBe(1000);
  });
});
