import type { ReactNode } from "react";

/* The four tools, shared by the header (NavBar, above 720px) and the phone tab
   bar (MobileTabBar, 720px and below). */

function ChecklistIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-6" aria-hidden>
      <path
        d="M4 5.5h12M4 10h12M4 14.5h7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="2" cy="5.5" r="1" fill="currentColor" />
      <circle cx="2" cy="10" r="1" fill="currentColor" />
      <circle cx="2" cy="14.5" r="1" fill="currentColor" />
    </svg>
  );
}

function AtlasIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-6" aria-hidden>
      <circle cx="10" cy="3.5" r="1.6" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="4" cy="16" r="1.6" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="16" cy="16" r="1.6" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M10 5.1V9M10 9L4 14.4M10 9l6 5.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-6" aria-hidden>
      <rect x="3" y="3" width="6" height="6" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11" y="3" width="6" height="6" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11" y="11" width="6" height="6" stroke="currentColor" strokeWidth="1.4" />
      <rect x="3" y="11" width="6" height="6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function CharacterIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-6" aria-hidden>
      <circle cx="10" cy="6" r="3" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const TOOL_LINKS: { href: string; label: string; short: string; icon: ReactNode }[] = [
  { href: "/checklist", label: "Checklist", short: "Checklist", icon: <ChecklistIcon /> },
  { href: "/atlas", label: "Atlas Tree", short: "Atlas", icon: <AtlasIcon /> },
  { href: "/dashboard", label: "Dashboard", short: "Farming", icon: <DashboardIcon /> },
  { href: "/character", label: "Character", short: "Character", icon: <CharacterIcon /> },
];
