"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";
import { OPEN_SEARCH_EVENT } from "./CommandPalette";
import { NavMenu } from "./NavMenu";

const noSubscribe = () => () => {};
/** "⌘K" on Apple devices, "Ctrl K" elsewhere. The static HTML says "Ctrl K". */
function useShortcutLabel() {
  return useSyncExternalStore(
    noSubscribe,
    () => (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘K" : "Ctrl K"),
    () => "Ctrl K"
  );
}

function ChecklistIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-4">
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
    <svg viewBox="0 0 20 20" fill="none" className="size-4">
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
    <svg viewBox="0 0 20 20" fill="none" className="size-4">
      <rect x="3" y="3" width="6" height="7" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11" y="9" width="6" height="8" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="3" y="12" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function CharacterIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-4">
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

const LINKS: { href: string; label: string; icon: ReactNode }[] = [
  { href: "/checklist", label: "Checklist", icon: <ChecklistIcon /> },
  { href: "/atlas", label: "Atlas Tree", icon: <AtlasIcon /> },
  { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { href: "/character", label: "Character", icon: <CharacterIcon /> },
];

export function NavBar() {
  const pathname = usePathname();
  const shortcut = useShortcutLabel();

  return (
    <nav className="site-nav" aria-label="Primary">
      <div className="shell flex flex-wrap items-center gap-x-1 gap-y-1 py-2">
        <Link href="/" aria-label="PoE2 Endgame Companion" className="mr-2 flex shrink-0 items-center gap-2 sm:mr-4">
          <svg viewBox="0 0 24 24" className="size-8 shrink-0" fill="none" aria-hidden>
            <path d="M12 2 L20 12 L12 22 L4 12 Z" stroke="var(--accent)" strokeWidth="1.5" fill="var(--accent-soft)" />
            <path d="M12 6 L16 12 L12 18 L8 12 Z" fill="var(--accent)" opacity="0.8" />
          </svg>
          <span className="font-display text-gradient-gold hidden text-[15px] font-bold uppercase sm:inline">
            PoE2 Endgame Companion
          </span>
        </Link>
        {/* Links wrap onto their own row on phones instead of squeezing. */}
        <div className="order-last flex w-full flex-wrap gap-x-1 sm:order-none sm:w-auto">
          {LINKS.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-1.5 px-2.5 text-sm max-sm:[&_svg]:hidden font-medium transition-colors sm:px-3 ${
                  active
                    ? "text-ink after:absolute after:inset-x-2.5 after:bottom-1.5 after:h-0.5 after:bg-accent [&_svg]:text-accent"
                    : "text-ink-mute hover:text-ink"
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
        <button
          onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))}
          // Warm the lazily loaded dialog before the click lands.
          onPointerEnter={() => void import("./SearchDialog")}
          onFocus={() => void import("./SearchDialog")}
          aria-label="Search"
          className="nav-search ml-auto flex min-w-[var(--tap-min)] shrink-0 items-center justify-center gap-2 rounded-md border border-line bg-surface-sunken/60 px-2.5 text-xs text-ink-mute transition-colors hover:border-accent hover:text-ink"
        >
          <svg viewBox="0 0 20 20" fill="none" className="size-3.5" aria-hidden>
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M16 16l-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="hidden sm:inline">Search</span>
          {/* Keyboard hint is noise on touch devices. */}
          <kbd className="hidden rounded border border-line px-1 py-0.5 font-mono text-[10px] text-ink-mute sm:inline">
            {shortcut}
          </kbd>
        </button>
        <NavMenu />
      </div>
    </nav>
  );
}
