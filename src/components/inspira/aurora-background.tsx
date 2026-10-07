"use client";

import type { ReactNode } from "react";

/**
 * Equivalente React de "Aurora Background" de Inspira UI / Aceternity UI.
 * Inspira UI es Vue/Nuxt (.vue + motion-v), por eso aquí se replica el
 * efecto solo con CSS + React, sin dependencias nuevas.
 */
export function AuroraBackground({
  children,
  className = "",
}: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <div className={"aurora-root " + className}>
      <div className="aurora-blob aurora-blob-a" aria-hidden="true" />
      <div className="aurora-blob aurora-blob-b" aria-hidden="true" />
      <div className="aurora-blob aurora-blob-c" aria-hidden="true" />
      <div className="aurora-grid" aria-hidden="true" />
      <div className="aurora-content">{children}</div>
    </div>
  );
}
