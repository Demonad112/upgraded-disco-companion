import { REGEX_MAX_LENGTH, regexStrings } from "@/data/endgameUpdate";
import { Accordion } from "@/components/shared/Accordion";
import { CopyButton } from "@/components/shared/CopyButton";
import { SourceFlag } from "@/components/shared/SourceFlag";
import { Tag } from "@/components/ui";

export function RegexPanel() {
  return (
    <Accordion
      id="atlas-regex"
      title="Search strings (copy and paste)"
      summary="Highlight soft-brick nodes on the Atlas tree, and filter stash or vendor gear."
      badge={
<Tag>{regexStrings.length} strings</Tag>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-dim">
          On the Atlas tree press <kbd className="border border-line px-1 font-mono text-xs">Ctrl+F</kbd>, paste
          the string with its quotes, then press Enter to step through matches. Search bars take{" "}
          {REGEX_MAX_LENGTH} characters at most, quotes included.
        </p>
        <ul className="grid gap-2">
          {regexStrings.map((r) => (
            <li key={r.id} id={r.id} className="scroll-mt-28 border border-line bg-surface-sunken px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-medium text-ink">{r.label}</span>
                <Tag tone={r.where === "atlas" ? "accent" : "default"}>{r.where === "atlas" ? "Atlas tree" : "Stash / vendor"}</Tag>
                <span className="tabular text-[length:var(--fs-micro)] text-ink-mute">{r.regex.length} chars</span>
                <SourceFlag source={r.source} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                <code className="break-all bg-surface-sunken px-2 py-1 font-mono text-xs text-ink">{r.regex}</code>
                <CopyButton text={r.regex} label={r.label} />
              </div>
              {r.note ? <p className="mt-1.5 text-xs text-ink-mute">{r.note}</p> : null}
            </li>
          ))}
        </ul>
      </div>
    </Accordion>
  );
}
