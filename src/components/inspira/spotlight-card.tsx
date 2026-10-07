"use client";

import { useRef, type ReactNode, type MouseEvent } from "react";

/**
 * Equivalente React de la "Spotlight Card" de Inspira UI.
 * Sigue el cursor con variables CSS --mx/--my para el brillo.
 */
export function SpotlightCard({
  children,
  className = "",
}: Readonly<{ children: ReactNode; className?: string }>) {
  const ref = useRef<HTMLElement>(null);

  function handleMove(event: MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    el.style.setProperty("--my", `${event.clientY - rect.top}px`);
  }

  return (
    <article ref={ref} onMouseMove={handleMove} className={"spotlight-card " + className}>
      <div className="spotlight-glow" aria-hidden="true" />
      <div className="spotlight-inner">{children}</div>
    </article>
  );
}
