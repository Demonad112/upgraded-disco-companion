import { CURRENT_PATCH, LEAGUE_LABEL } from "@/lib/constants";
import { BannerDismiss } from "./BannerDismiss";

/**
 * The single place the "unverified / conflicting" key is shown. One line on
 * phones, the full note from `sm` up. Closing it is remembered for this patch
 * only (see lib/bannerDismiss).
 */
export function PatchVersionBanner() {
  return (
    <div className="patch-banner border-b border-line bg-surface/70 text-[12px] leading-relaxed text-ink-mute">
      <div className="shell flex items-center gap-2 py-1.5">
        <p className="min-w-0 flex-1 text-center">
          <span className="block truncate sm:hidden">
            Patch <strong className="font-semibold text-ink">{CURRENT_PATCH}</strong> · community data —{" "}
            <span className="font-medium text-warn">⚠ unverified/conflicting</span>: check in-game
          </span>
          <span className="hidden sm:inline">
            Data current as of patch{" "}
            <strong className="font-semibold text-ink">{CURRENT_PATCH}</strong>{" "}
            ({LEAGUE_LABEL}) — community-derived, may drift from future patches. Key:{" "}
            <span className="font-medium text-warn">⚠ unverified/conflicting</span>{" "}
            means double-check it in-game.
          </span>
        </p>
        <BannerDismiss patch={CURRENT_PATCH} />
      </div>
    </div>
  );
}
