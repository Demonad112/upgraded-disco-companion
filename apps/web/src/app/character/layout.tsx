import type { Metadata } from "next";

// The page itself is a client component, so its title lives here.
export const metadata: Metadata = {
  title: "Character Import — PoE2 Endgame Companion",
};

export default function CharacterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
