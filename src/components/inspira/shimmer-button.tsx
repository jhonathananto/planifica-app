"use client";

import type { ButtonHTMLAttributes } from "react";

/**
 * Equivalente React del "Shimmer Button" de Magic/Inspira UI.
 * Mantiene la API de <button> para no romper Server Actions.
 */
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  shimmer?: boolean;
};

export function ShimmerButton({ shimmer = true, className = "", children, ...rest }: Readonly<Props>) {
  return (
    <button className={"button button-primary button-full shimmer-btn " + (shimmer ? "shimmer-on " : "") + className} {...rest}>
      <span className="shimmer-label">{children}</span>
      <span className="shimmer-sheen" aria-hidden="true" />
    </button>
  );
}
