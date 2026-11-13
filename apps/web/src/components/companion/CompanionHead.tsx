import type { CompanionPose } from '@/lib/companion'

/**
 * PLACEHOLDER ART. The companion's whole look lives in this one file: a hooded seer, a dark angular hood with a gold
 * rim and two ember eyes. Swap this component to change the character; poses are driven by `data-pose` in
 * styles/companion.css (classes `cmp-*` below are the hooks it animates). Exempt from the square-corner rule.
 */
export function CompanionHead({ pose, size = 48 }: { pose: CompanionPose; size?: number }) {
  return (
    <svg
      className="cmp-head"
      data-pose={pose}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <g className="cmp-tilt">
        {/* Hood: angular, pointed crown. */}
        <path className="cmp-hood" d="M32 4 L52 22 L57 60 L7 60 L12 22 Z" />
        {/* The dark opening the eyes sit in. */}
        <path className="cmp-face" d="M32 17 L43 28 L45 54 L19 54 L21 28 Z" />
        <g className="cmp-eyes">
          <ellipse className="cmp-glow" cx="26.5" cy="36" rx="5" ry="4" />
          <ellipse className="cmp-glow" cx="37.5" cy="36" rx="5" ry="4" />
          <ellipse className="cmp-eye" cx="26.5" cy="36" rx="2.2" ry="1.8" />
          <ellipse className="cmp-eye" cx="37.5" cy="36" rx="2.2" ry="1.8" />
        </g>
        {/* Closed eyes, shown only asleep. */}
        <path className="cmp-shut" d="M23.5 37 h6 M34.5 37 h6" />
        {/* Mouth slit, shown only while talking. */}
        <path className="cmp-mouth" d="M29 45 h6" />
      </g>
      <path className="cmp-z" d="M47 6 h6 l-6 7 h6" />
    </svg>
  )
}
