"use client";

import Link from "next/link";
import { useRef } from "react";
import { CURRENT_PATCH, LEAGUES } from "@/lib/constants";
import { compactMode } from "@/lib/compactMode";
import { useLocalStore } from "@/lib/localStore";
import { InstallButton } from "@/components/InstallButton";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useResetProgress } from "@/hooks/useResetProgress";
import { SkyDimToggle } from "@/components/fx/SkySettings";
import { Button } from "@/components/shared/controls";

const TOOLS = [
  { href: "/character", label: "Character" },
  { href: "/checklist", label: "Checklist" },
  { href: "/atlas", label: "Atlas Tree" },
  { href: "/dashboard", label: "Dashboard" },
] as const;

const REPO = "https://github.com/Demonad112/upgraded-disco-companion";

/** Short hash of the generated game data (hashed into the build by next.config.ts); "dev" outside a build. */
const DATA_VERSION = (process.env.NEXT_PUBLIC_DATA_VERSION ?? "dev").slice(0, 8);

export function Footer() {
  const resetProgress = useResetProgress();
  const { state } = usePersistedState();
  const dialog = useRef<HTMLDialogElement>(null);
  const { on: compact } = useLocalStore(compactMode);
  const steps = state.checklist.completedStepIds.length;

  return (
    <footer className="site-footer border-t border-line py-8 text-xs text-ink-mute">
      <div className="shell">
        <div className="footer-cols">
          <section aria-labelledby="footer-tools">
            <h2 id="footer-tools" className="footer-title">Tools</h2>
            <ul>
              {TOOLS.map((t) => (
                <li key={t.href}>
                  <Link href={t.href} className="footer-link">
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="footer-resources">
            <h2 id="footer-resources" className="footer-title">Resources</h2>
            <ul>
              <li>
                <Link href="/methodology" className="footer-link">
                  Methodology
                </Link>
              </li>
              <li>
                <Link href="/whats-new" className="footer-link">
                  What&apos;s new
                </Link>
              </li>
              <li>
                <a href={REPO} className="footer-link" target="_blank" rel="noopener noreferrer">
                  GitHub repo
                </a>
              </li>
              <li>
                <a href={`${REPO}/issues`} className="footer-link" target="_blank" rel="noopener noreferrer">
                  Report an issue
                </a>
              </li>
            </ul>
          </section>

          <section aria-labelledby="footer-data">
            <h2 id="footer-data" className="footer-title">
              Data
            </h2>
            <dl className="footer-facts">
              <div>
                <dt>Patch</dt>
                <dd className="tabular">{CURRENT_PATCH}</dd>
              </div>
              <div>
                <dt>Leagues</dt>
                <dd>{LEAGUES.join(", ")}</dd>
              </div>
              <div>
                <dt>Data version</dt>
                <dd className="tabular font-mono">{DATA_VERSION}</dd>
              </div>
            </dl>
            <p className="mt-2">
              Character numbers come from{" "}
              <a href="https://poe.ninja/poe2" className="footer-link inline" target="_blank" rel="noopener noreferrer">
                poe.ninja
              </a>
              .
            </p>
          </section>

          <section aria-labelledby="footer-settings">
            <h2 id="footer-settings" className="footer-title">
              Settings
            </h2>
            <ul>
              <li>
                <SkyDimToggle />
              </li>
              <li>
                <label className="hit-area flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={compact}
                    onChange={(e) => compactMode.set(() => ({ on: e.target.checked }))}
                  />
                  Compact mode
                </label>
              </li>
              <li>
                <InstallButton className="footer-link" />
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => dialog.current?.showModal()}
                  className="hit-area hover:text-danger"
                >
                  Reset all progress
                </button>
              </li>
            </ul>
          </section>
        </div>

        <p className="footer-legal">
          Unofficial fan project — not affiliated with or endorsed by Grinding Gear Games. MIT licensed.
        </p>
      </div>

      {/* In-page confirm. Esc and "Keep progress" both leave progress untouched. */}
      <dialog ref={dialog} className="confirm" aria-labelledby="reset-title" aria-describedby="reset-body">
        <h2 id="reset-title" className="text-base">
          Reset all progress?
        </h2>
        <p id="reset-body" className="mt-3 text-sm text-ink-dim">
          This will clear{" "}
          <strong className="tabular text-ink">
            {steps} completed {steps === 1 ? "step" : "steps"}
          </strong>
          , your ticked sub-steps, Atlas allocation and dashboard selections in this browser. It can&apos;t be undone.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="primary" onClick={() => dialog.current?.close()}>
            Keep progress
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              resetProgress();
              dialog.current?.close();
            }}
          >
            Reset progress
          </Button>
        </div>
      </dialog>
    </footer>
  );
}
