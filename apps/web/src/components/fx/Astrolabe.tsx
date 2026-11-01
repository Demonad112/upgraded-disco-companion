/**
 * Astrolabe scroll compass (MP1): a thin brass ring fixed behind the header. Static markup and CSS only (no JS on
 * any page): the dial turns with the page's scroll (`animation-timeline: scroll(root)`, styles/motion.css), and the
 * ticks are dashed circles with butt caps, so each one is a square. Pages with a ScrollSpyNav add one square per
 * section to the outer ring (`[data-astro-sections]`), at the scroll position where that section starts; the dial's
 * pointer reaches each as the page gets there.
 */
export function Astrolabe() {
  return (
    <svg aria-hidden className="astrolabe" data-fx="astrolabe" viewBox="-100 -100 200 200" fill="none">
      <g className="astro-ring">
        <circle r="95" strokeWidth="0.75" />
        {/* 24 squares, 15° apart; starts at the top. */}
        <circle r="90" strokeWidth="2.5" strokeDasharray="2.5 21.062" transform="rotate(-90.8)" />
      </g>
      <g data-astro-sections />
      <g className="astro-dial">
        <circle r="72" strokeWidth="0.75" />
        <circle r="67" strokeWidth="3" strokeDasharray="1 7.639" transform="rotate(-90.4)" />
        <circle r="65" strokeWidth="7" strokeDasharray="1.2 49.065" transform="rotate(-90.5)" />
        <path className="astro-pointer" d="M0 -6V-84" strokeWidth="1" />
        <rect className="astro-tip" x="-2.5" y="-91" width="5" height="5" />
        <rect className="astro-tip" x="-3" y="-3" width="6" height="6" transform="rotate(45)" />
      </g>
    </svg>
  )
}
