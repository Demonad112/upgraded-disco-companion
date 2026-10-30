import { describe, expect, it } from "vitest";
import { KEYBOARD_MIN_PX, keyboardOpen } from "@/lib/keyboardOpen";

describe("on-screen keyboard detection (tab bar hide)", () => {
  it("is open when the visual viewport loses more than the threshold", () => {
    expect(keyboardOpen(844, 500)).toBe(true);
    expect(keyboardOpen(844, 844 - KEYBOARD_MIN_PX - 1)).toBe(true);
  });

  it("stays closed for toolbar-sized changes", () => {
    expect(keyboardOpen(844, 844)).toBe(false);
    expect(keyboardOpen(844, 780)).toBe(false);
    expect(keyboardOpen(844, 844 - KEYBOARD_MIN_PX)).toBe(false);
  });

  it("does not mistake pinch zoom for a keyboard", () => {
    expect(keyboardOpen(844, 422, 2)).toBe(false);
    expect(keyboardOpen(844, 250, 2)).toBe(true);
  });
});
