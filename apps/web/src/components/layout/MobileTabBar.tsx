"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { keyboardOpen } from "@/lib/keyboardOpen";
import { TOOL_LINKS } from "./navLinks";

/**
 * Phone navigation: the four tools in a bar fixed to the bottom of the screen.
 * Shown at 720px and below only (styles/nav.css); compact mode hides it. It
 * sits after <main> in the DOM, so the focus order is header, main, tab bar.
 * It also hides while the on-screen keyboard is up, so it never covers the
 * field being typed in.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const typing = useKeyboardOpen();

  return (
    <nav aria-label="Tools" className="tab-bar" data-keyboard-open={typing ? "" : undefined}>
      <ul>
        {TOOL_LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href} aria-current={pathname?.startsWith(link.href) ? "page" : undefined}>
              {link.icon}
              <span>{link.short}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** True while the visual viewport is much shorter than the layout viewport. */
function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setOpen(keyboardOpen(window.innerHeight, vv.height, vv.scale));
    vv.addEventListener("resize", update);
    return () => vv.removeEventListener("resize", update);
  }, []);
  return open;
}
