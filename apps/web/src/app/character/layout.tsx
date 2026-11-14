import type { Metadata } from "next";
import { pageMeta } from '@/lib/pageMeta'

// The page itself is a client component, so its title lives here.
export const metadata: Metadata = pageMeta('Character Import', 'Paste your poe.ninja character and see the top things to fix first.')

export default function CharacterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
