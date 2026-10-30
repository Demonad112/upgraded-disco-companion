import { CURRENT_PATCH, LEAGUE_LABEL } from "@/lib/constants";
import { BannerDismiss } from "./BannerDismiss";
import { BannerInfo } from "./BannerInfo";

/**
 * The patch notice. From `sm` up it carries the full note and the
 * "unverified / conflicting" key; on phones it is a short line whose ⓘ opens
 * the Patch menu, which repeats the full note (NavMenu). Closing it is
 * remembered for this patch only (see lib/bannerDismiss).
 */
export function PatchVersionBanner() {
  return (
    <div className="patch-banner border-b border-line bg-surface/70 text-[12px] leading-relaxed text-ink-mute">
      <div className="shell flex items-center gap-2 py-1.5">
        <p className="min-w-0 flex-1 text-center">
          <span className="sm:hidden">
            Patch <strong className="font-semibold text-ink">{CURRENT_PATCH}</strong> · community data{" "}
            <BannerInfo />
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
