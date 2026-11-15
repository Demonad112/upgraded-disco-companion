/**
 * The wraith (v2 art, locked 2026-11-15; Figma "Wraith companion v2"). One
 * master drawing in a 120×180 box, hand-kept so layer classes survive (Figma's
 * export renames them). Blue eyes only; asleep dims them in CSS. The rim is a
 * touch brighter than the board, so the figure still reads at 56px on the dark
 * page. Motion lives in styles/companion.css (transform and opacity only).
 * Gradient ids are fixed: the site draws one wraith at a time.
 */
export function Wraith({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 180" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="wr-cloak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b3c48" />
          <stop offset=".45" stopColor="#18181f" />
          <stop offset="1" stopColor="#0b0b0f" />
        </linearGradient>
        <linearGradient id="wr-hem" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#121218" />
          <stop offset="1" stopColor="#121218" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="wr-void" cx=".5" cy=".42" r=".62">
          <stop offset=".55" stopColor="#000" />
          <stop offset="1" stopColor="#08080b" />
        </radialGradient>
        <radialGradient id="wr-glow">
          <stop className="wr-gs" offset="0" stopOpacity=".6" />
          <stop className="wr-gs" offset="1" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="wr-body">
        <path fill="url(#wr-hem)" d="M34 128L30 176L38 150L44 181L50 152L58 178L64 152L72 183L78 150L86 173L90 128Z" />
        <path
          fill="url(#wr-cloak)"
          d="M52 2C58 5 68 12 76 22C83 31 86 43 84 55L87 58L85 61C95 72 99 88 98 104C97 118 93 130 90 140L92 150L86 146L88 162L81 148L78 170L73 150L69 158L65 147L61 174L57 148L52 160L49 147L44 168L41 148L36 156L34 142C30 130 24 118 23 104C22 88 27 72 35 62L33 59L36 57C34 45 36 31 42 20C45 13 48 6 52 2Z"
        />
        <path fill="#000" fillOpacity=".35" d="M84 55C95 72 99 88 98 104C97 118 93 130 90 140L82 140C86 118 86 88 78 64Z" />
        <path
          fill="#050507"
          fillOpacity=".75"
          d="M40 68Q36 100 36 144L41 146Q42 104 45 72ZM80 68Q84 100 82 150L78 150Q80 104 75 72ZM58 90Q57 120 58 170L61 172Q62 120 61 90Z"
        />
        <path fill="#2c2d38" fillOpacity=".8" d="M45 72Q42 104 42 146L45 147Q46 106 47 76ZM61 90Q62 120 62 160L64 158Q65 120 63 92Z" />
        <path
          fill="none"
          className="wr-gold"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeOpacity=".85"
          d="M52 2C48 6 45 13 42 20C36 31 34 45 36 57M35 62C28 71 23 86 23 104"
        />
        <path
          fill="none"
          stroke="#5a6378"
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeOpacity=".7"
          d="M76 22C83 31 86 43 84 55M85 61C95 72 99 88 98 104"
        />
        <path fill="#1b1b22" d="M60 13Q43 24 40 45Q39 64 49 78Q60 86 71 78Q81 64 80 45Q77 24 60 13Z" />
        <path fill="none" className="wr-gold" strokeWidth=".8" strokeLinecap="round" strokeOpacity=".35" d="M59 15Q45 25 41 44" />
        <path fill="url(#wr-void)" d="M60 20Q49 29 46 45Q45 60 52 72Q60 78 68 72Q75 60 74 45Q71 29 60 20Z" />
        <ellipse className="wr-glow" cx="60" cy="50" rx="15" ry="7" fill="url(#wr-glow)" />
        <path
          className="wr-eyes"
          d="M47 47Q53 48.6 57.5 51.2Q52.5 52.2 48.6 50.2ZM73 47Q67 48.6 62.5 51.2Q67.5 52.2 71.4 50.2Z"
        />
      </g>
    </svg>
  )
}
