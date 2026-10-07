"use client";

/**
 * Equivalente React del "Text Generate Effect" de Inspira/Aceternity.
 * Revela el titular palabra por palabra con CSS puro.
 */
export function RevealText({ text, className = "" }: Readonly<{ text: string; className?: string }>) {
  const words = text.split(" ");
  return (
    <span className={"reveal-text " + className} aria-label={text}>
      {words.map((word, i) => (
        <span key={word + i} className="reveal-word" style={{ animationDelay: `${i * 90}ms` }} aria-hidden="true">
          {word}
          {i < words.length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </span>
  );
}
