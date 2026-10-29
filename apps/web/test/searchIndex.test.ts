/**
 * The search palette jumps to `href#id`, so an id shared by two entries would
 * land one of them on the wrong section.
 */
import { describe, expect, it } from "vitest";
import { searchIndex } from "@/lib/searchIndex";
import { METHODOLOGY_SECTIONS } from "@/data/methodology";

describe("search index", () => {
  it("has unique ids", () => {
    const ids = searchIndex.map((e) => e.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it("lists the Methodology and What's new pages, and every Methodology section", () => {
    const hrefs = new Map(searchIndex.map((e) => [e.id, e.href]));
    expect(hrefs.get("methodology")).toBe("/methodology");
    expect(hrefs.get("whats-new")).toBe("/whats-new");
    for (const s of METHODOLOGY_SECTIONS) expect(hrefs.get(s.id)).toBe("/methodology");
  });
});
