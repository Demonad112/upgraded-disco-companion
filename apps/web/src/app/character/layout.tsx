import type { Metadata } from "next";
import { pageMeta } from '@/lib/pageMeta'
import { IMPORT_PROMPT } from '@/lib/proxy'

// The page itself is a client component, so its title lives here.
export const metadata: Metadata = pageMeta('Character Import', IMPORT_PROMPT)

export default function CharacterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
