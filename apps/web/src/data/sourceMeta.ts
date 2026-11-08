import type { SourceRef } from "@/lib/types";

export function atlasSource(
  overrides: Partial<SourceRef> = {}
): SourceRef {
  return {
    sourceDoc: "atlas-tree-fundamentals",
    asOfPatch: "0.5.4",
    verified: "confirmed",
    ...overrides,
  };
}

/**
 * A fact taken from the 0.5.5 patch notes rather than a guide. Records the
 * patch corrected carry this instead of their guide source, so a changed fact
 * is never attributed to a guide that predates it.
 */
export function patchSource(
  overrides: Partial<SourceRef> = {}
): SourceRef {
  return {
    sourceDoc: "patch-0.5.5",
    asOfPatch: "0.5.5",
    verified: "confirmed",
    ...overrides,
  };
}

export function strategySource(
  overrides: Partial<SourceRef> = {}
): SourceRef {
  return {
    sourceDoc: "strategy-guide",
    asOfPatch: "0.5.4b",
    verified: "confirmed",
    ...overrides,
  };
}

/** A claim from a creator video recorded on patch 0.5.5. */
export function videoSource(
  citations: string[],
  overrides: Partial<SourceRef> = {}
): SourceRef {
  return {
    sourceDoc: "creator-videos-0.5.5",
    asOfPatch: "0.5.5",
    verified: "confirmed",
    citations,
    ...overrides,
  };
}

/** A claim from a 0.5.x creator video that 0.5.5 didn't change. */
export function video05Source(
  citations: string[],
  overrides: Partial<SourceRef> = {}
): SourceRef {
  return {
    sourceDoc: "creator-videos-0.5",
    asOfPatch: "0.5.x",
    verified: "confirmed",
    citations,
    ...overrides,
  };
}

/**
 * A claim only the AI-compiled web digest makes. Always unverified: it mixes
 * in PoE1 mechanics and pre-0.5.5 rules, so nothing rests on it alone.
 */
export function digestSource(note: string): SourceRef {
  return {
    sourceDoc: "community-digest-0.5.5",
    asOfPatch: "0.5.5",
    verified: "unverified",
    note,
  };
}

/** Parses `"<youtubeId>@mm:ss"` (or `h:mm:ss`) into a timestamped link. */
export function citationUrl(citation: string): { href: string; label: string } | null {
  const at = citation.lastIndexOf("@");
  if (at <= 0) return null;
  const id = citation.slice(0, at);
  const stamp = citation.slice(at + 1).split(/[–-]/)[0];
  const parts = stamp.split(":").map(Number);
  if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return null;
  const seconds = parts.reduce((acc, n) => acc * 60 + n, 0);
  return { href: `https://youtu.be/${id}?t=${seconds}`, label: stamp };
}
