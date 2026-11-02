"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { farmingStrategies } from "@/data/strategies";
import { tabPanelProps } from "@/components/shared/controls";
import { useFarm } from "@/hooks/useFarm";
import "@/styles/farm.css";
import { DecideStep } from "./DecideStep";
import { CUSTOM_FARM, HASH_PREFIX } from "./ids";

// Step 2 carries the farm data and the engine; it loads when first opened so /dashboard/ stays light.
const SetupStep = dynamic(() => import("./SetupStep"), {
  ssr: false,
  loading: () => <p className="text-sm text-ink-mute" role="status">Loading the planner…</p>,
});

type Step = "decide" | "setup";
const known = (id: string) => id === CUSTOM_FARM || farmingStrategies.some((s) => s.id === id);

/** The farm planner (FP1): 1 Decide, 2 Set up. Step 2 stays disabled until a farm is picked. */
export function FarmPlanner() {
  const { farm, setCurrent } = useFarm();
  const current = farm.current;
  const [step, setStep] = useState<Step>("decide");
  const [picked, setPicked] = useState<string | null>(null);
  const settled = useRef(false);
  const tabs = useRef<Record<Step, HTMLButtonElement | null>>({ decide: null, setup: null });

  const open = (id: string) => {
    settled.current = true;
    setPicked(id);
    setStep("setup");
    setCurrent(id);
    history.replaceState(null, "", `#${HASH_PREFIX}${id}`);
  };
  const back = () => {
    settled.current = true;
    setStep("decide");
    history.replaceState(null, "", window.location.pathname + window.location.search);
  };

  // A #farm-<id> link opens Step 2 for that farm.
  useEffect(() => {
    const fromHash = () => {
      const h = decodeURIComponent(window.location.hash.slice(1));
      if (!h.startsWith(HASH_PREFIX)) return;
      const id = h.slice(HASH_PREFIX.length);
      if (!known(id)) return;
      settled.current = true;
      setPicked(id);
      setStep("setup");
      setCurrent(id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [setCurrent]);

  // A reload lands back in Step 2 for the last farm, once the saved state has loaded (it is empty during hydration).
  useEffect(() => {
    const restore = () => {
      if (settled.current || !current || !known(current)) return;
      settled.current = true;
      setPicked(current);
      setStep("setup");
    };
    restore();
  }, [current]);

  const go = (next: Step) => {
    if (next === "setup" && !picked) return;
    if (next === "decide") back();
    else setStep(next);
  };
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const order: Step[] = picked ? ["decide", "setup"] : ["decide"];
    const i = order.indexOf(step);
    const next = e.key === "ArrowRight" ? order[Math.min(i + 1, order.length - 1)] : e.key === "ArrowLeft" ? order[Math.max(i - 1, 0)] : e.key === "Home" ? order[0] : e.key === "End" ? order[order.length - 1] : null;
    if (!next) return;
    e.preventDefault();
    go(next!);
    tabs.current[next!]?.focus();
  };

  const item = (id: Step, label: string, n: number, disabled: boolean) => (
    <button
      key={id}
      ref={(el) => { tabs.current[id] = el; }}
      type="button"
      role="tab"
      id={`farm-tab-${id}`}
      aria-controls={`farm-panel-${id}`}
      aria-selected={step === id}
      tabIndex={step === id ? 0 : -1}
      disabled={disabled}
      className="seg-item"
      onClick={() => go(id)}
      onKeyDown={onKey}
    >
      <span className="seg-count tabular">{n}</span> {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Farm planner steps" className="seg farm-steps">
        {item("decide", "Decide", 1, false)}
        {item("setup", "Set up", 2, !picked)}
      </div>
      <div {...tabPanelProps("farm", step)} id={`farm-panel-${step}`} aria-labelledby={`farm-tab-${step}`}>
        {step === "decide" ? <DecideStep onPick={open} /> : picked ? <SetupStep key={picked} strategyId={picked} onChangeFarm={back} /> : null}
      </div>
    </div>
  );
}
