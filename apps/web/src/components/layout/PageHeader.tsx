import type { ReactNode } from "react";
import { Triad } from "@/components/layout/Triad";

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description: ReactNode;
}) {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-[0.02em] text-ink sm:text-4xl">
        {title}
      </h1>
      <Triad />
      <p className="mt-4 max-w-3xl leading-relaxed text-ink-dim">{description}</p>
    </div>
  );
}
