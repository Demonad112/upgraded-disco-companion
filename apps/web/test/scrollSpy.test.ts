import { describe, expect, it } from "vitest";
import { atPageBottom } from "@/hooks/useScrollSpy";

describe("scroll spy at the end of the page (U13b-3)", () => {
  it("is at the bottom once the page can't scroll further", () => {
    expect(atPageBottom(1156, 390, 1546)).toBe(true);
    expect(atPageBottom(1155.5, 390, 1546)).toBe(true);
  });

  it("is not at the bottom with more than the slack still to scroll", () => {
    expect(atPageBottom(1100, 390, 1546)).toBe(false);
    expect(atPageBottom(0, 390, 1546)).toBe(false);
  });

  it("never claims the bottom on a page that doesn't scroll", () => {
    expect(atPageBottom(0, 844, 600)).toBe(false);
    expect(atPageBottom(0, 844, 844)).toBe(false);
  });
});
