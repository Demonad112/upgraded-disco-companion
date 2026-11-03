import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { roadmapSteps } from "@/data/roadmap";
import WaystoneLadder from "@/components/diagrams/WaystoneLadder";
import AtlasPath from "@/components/diagrams/AtlasPath";
import BossOrder from "@/components/diagrams/BossOrder";

const svgs = { "waystone-ladder": WaystoneLadder, "atlas-path": AtlasPath, "boss-order": BossOrder };

describe("V1 step diagrams", () => {
  it("sits on the three steps the plan names", () => {
    const keyed = Object.fromEntries(roadmapSteps.filter((s) => s.diagram).map((s) => [s.id, s.diagram]));
    expect(keyed).toEqual({
      "step-waystone-engine": "waystone-ladder",
      "step-precursor-tower": "atlas-path",
      "step-arbiter-of-ash": "boss-order",
    });
  });

  it.each(Object.entries(svgs))("%s uses tokens, square nodes and capital labels", (_, Svg) => {
    const html = renderToStaticMarkup(createElement(Svg));
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b/i); // :root tokens only
    expect(html).not.toMatch(/\brx=|<circle|<ellipse/); // square corners
    const labels = [...html.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map((m) => m[1]);
    expect(labels.length).toBeGreaterThan(3);
    for (const l of labels) expect(l).toBe(l.toUpperCase());
  });
});
