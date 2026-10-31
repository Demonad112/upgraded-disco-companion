/**
 * Analysis takes a moment (a 388 KB payload plus a zlib inflate for the PoB
 * cross-check). The layout must not appear frozen, and it must not jump when
 * the real content lands — so the skeleton mirrors the Overview it becomes
 * (U10): the section tab bar, the verdict card with its grade ladder, the
 * spare-to-trade row and the defences glance.
 */
export function Skeleton() {
  return (
    <div className="grid-cards" aria-busy="true" aria-live="polite">
      <span className="sr-only">Analysing character…</span>

      {/* Section tab bar */}
      <div className="flex gap-3 border-b border-line py-3.5">
        {[16, 20, 20, 16, 12, 16, 20].map((w, i) => (
          <div key={i} className="skeleton h-4" style={{ width: `${w * 4}px` }} />
        ))}
      </div>

      {/* Verdict: name and tags, grade and ladder, kills-first box, four vitals */}
      <div data-surface="data" className="card">
        <div className="grid items-end gap-x-8 gap-y-5 min-[621px]:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton mt-2 h-12 w-full max-w-72" />
            <div className="skeleton mt-3 h-4 w-48" />
            <div className="mt-3 flex gap-2">
              <div className="skeleton h-[22px] w-28" />
              <div className="skeleton h-[22px] w-20" />
            </div>
          </div>
          <div className="grid min-[621px]:justify-items-end">
            <div className="skeleton h-[72px] w-16 min-[621px]:h-[88px]" />
            <div className="mt-3 flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton size-7" />
              ))}
            </div>
            <div className="skeleton mt-1.5 h-4 w-12" />
          </div>
        </div>
        <div className="skeleton mt-3 h-4 w-full max-w-prose" />
        <div className="skeleton mt-5 h-28" />
        <div className="mt-5 grid grid-cols-2 gap-3 min-[621px]:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-[74px]" />
          ))}
        </div>
      </div>

      {/* Spare to trade and since last import */}
      <div data-surface="data" className="card grid gap-6 desk:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i}>
            <div className="skeleton h-5 w-40" />
            <div className="skeleton mt-3 h-16" />
          </div>
        ))}
      </div>

      {/* Defences at a glance */}
      <div data-surface="data" className="card">
        <div className="skeleton h-5 w-48" />
        <div className="mt-3 grid grid-cols-2 gap-3 min-[621px]:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-[104px]" />
          ))}
        </div>
      </div>
    </div>
  )
}
