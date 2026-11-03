"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { BASE_PATH } from "@/lib/basePath";
import { OfflineChip } from "@/components/OfflineChip";
import { OPEN_SEARCH_EVENT, preloadSearch } from "./CommandPalette";
import { NavMenu } from "./NavMenu";
import { TOOL_LINKS } from "./navLinks";

const noSubscribe = () => () => {};
/** "⌘K" on Apple devices, "Ctrl K" elsewhere. The static HTML says "Ctrl K". */
function useShortcutLabel() {
  return useSyncExternalStore(
    noSubscribe,
    () => (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘K" : "Ctrl K"),
    () => "Ctrl K"
  );
}

/**
 * View Transitions between routes (MP1). Next's Link navigates in the same document, so the CSS
 * `@view-transition { navigation: auto }` rule only covers full loads; this wraps every plain left click on an
 * internal link in `document.startViewTransition` and finishes the transition once the new route has committed.
 * Unsupported browsers and reduced motion keep plain navigation (no polyfill).
 */
function useRouteTransitions(pathname: string) {
  const router = useRouter();
  const done = useRef<(() => void) | null>(null);

  useEffect(() => {
    done.current?.();
    done.current = null;
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement) || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href);
      if (url.origin !== location.origin || (BASE_PATH && !url.pathname.startsWith(BASE_PATH))) return;
      const path = url.pathname.slice(BASE_PATH.length) || "/";
      const here = location.pathname.slice(BASE_PATH.length) || "/";
      if (path.replace(/\/$/, "") === here.replace(/\/$/, "")) return;
      // Ahead of Link's own handler, which skips a prevented click.
      e.preventDefault();
      document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            done.current = resolve;
            // A navigation that never commits must not freeze the page.
            setTimeout(resolve, 1500);
            router.push(path + url.search + url.hash);
          })
      );
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);
}

export function NavBar() {
  const pathname = usePathname();
  const shortcut = useShortcutLabel();
  useRouteTransitions(pathname);

  return (
    <nav className="site-nav" aria-label="Primary">
      <div className="shell flex items-center gap-x-1 py-2">
        <Link href="/" aria-label="PoE2 Endgame Companion" className="mr-2 flex shrink-0 items-center gap-2 sm:mr-4">
          <svg viewBox="0 0 24 24" className="size-8 shrink-0" fill="none" aria-hidden>
            <path d="M12 2 L20 12 L12 22 L4 12 Z" stroke="var(--accent)" strokeWidth="1.5" fill="var(--accent-soft)" />
            <path d="M12 6 L16 12 L12 18 L8 12 Z" fill="var(--accent)" opacity="0.8" />
          </svg>
          <span className="font-display text-gradient-gold hidden text-[15px] font-bold uppercase min-[1100px]:inline">
            PoE2 Endgame Companion
          </span>
        </Link>
        {/* Icon and label above 720px. At 720px and below the tools move to the
            tab bar (MobileTabBar) and this row hides in CSS, except in compact
            mode, which hides the tab bar and keeps these as icons. */}
        <div className="nav-tools flex gap-x-1">
          {TOOL_LINKS.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                aria-label={link.label}
                className={`relative flex min-w-[var(--tap-min)] items-center justify-center gap-1.5 border px-2.5 text-sm font-medium transition-colors sm:px-3 ${
                  active
                    ? "border-accent-line bg-accent-soft text-accent"
                    : "border-transparent text-ink-mute hover:text-ink"
                }`}
              >
                {link.icon}
                <span className="nav-label">{link.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-x-1">
          <OfflineChip />
          <button
            onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))}
            // Warm the lazily loaded dialog before the click lands.
            onPointerEnter={preloadSearch}
            onFocus={preloadSearch}
            aria-label="Search"
            className="nav-search flex min-w-[var(--tap-min)] shrink-0 items-center justify-center gap-2 border border-line-strong bg-surface-sunken/60 px-2.5 text-xs text-ink-mute transition-colors hover:border-accent hover:text-ink"
          >
            <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden>
              <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M16 16l-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="hidden lg:inline">Search</span>
            {/* Keyboard hint is noise on touch devices. */}
            <kbd className="hidden border border-line px-1 py-0.5 font-mono text-[10px] text-ink-mute lg:inline">
              {shortcut}
            </kbd>
          </button>
          <NavMenu />
        </div>
      </div>
    </nav>
  );
}
