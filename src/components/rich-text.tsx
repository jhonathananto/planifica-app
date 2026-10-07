"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type Quill from "quill";
import "quill/dist/quill.snow.css";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  /** Límite en caracteres de texto plano. Si se omite, sin límite. */
  maxLength?: number;
};

// Barra completa: fuente, tamaño, negrita/cursiva/subrayado, color,
// super/subíndice, títulos, listas, sangría, alineación, cita, enlace.
const TOOLBAR: unknown[] = [
  [{ font: [] }, { size: ["small", false, "large", "huge"] }],
  ["bold", "italic", "underline", "strike"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ header: 1 }, { header: 2 }],
  [{ list: "ordered" }, { list: "bullet" }],
  [{ indent: "-1" }, { indent: "+1" }],
  [{ align: [] }],
  ["blockquote", "code-block", "link"],
  ["clean"],
];

/** Convierte texto plano heredado a HTML sin perder saltos de línea. */
function toHtml(raw: string): string {
  const text = String(raw ?? "");
  if (!text.trim()) return "";
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split(/\n{2,}/)
    .map((p) => "<p>" + p.replace(/\n/g, "<br>") + "</p>")
    .join("");
}

export default function RichText({ value, onChange, placeholder = "", minHeight = 120, maxLength }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Quill | null>(null);
  const lastSentRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;

    const mount = async () => {
      const { default: QuillClass } = await import("quill");
      if (cancelled || !hostRef.current) return;
      const editor = new QuillClass(host, {
        theme: "snow",
        placeholder,
        modules: { toolbar: TOOLBAR },
      });
      const initial = toHtml(value);
      if (initial) editor.clipboard.dangerouslyPasteHTML(0, initial);
      lastSentRef.current = editor.root.innerHTML;
      setCount(editor.getText().trim().length);
      editor.on("text-change", () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          const current = editorRef.current;
          if (!current) return;
          if (maxLength && current.getText().trim().length > maxLength) {
            current.deleteText(maxLength, current.getLength());
          }
          const html = current.root.innerHTML;
          setCount(current.getText().trim().length);
          if (html !== lastSentRef.current) {
            lastSentRef.current = html;
            onChangeRef.current(html);
          }
        }, 250);
      });
      editorRef.current = editor;
    };
    void mount();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      editorRef.current = null;
    };
    // Solo montar una vez; el valor externo se sincroniza abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincroniza cambios externos (p. ej. datos recién cargados) sin mover el cursor
  // mientras el docente escribe.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || value === lastSentRef.current) return;
    const incoming = toHtml(value);
    if (editor.root.innerHTML !== incoming) {
      editor.setContents([]);
      if (incoming) editor.clipboard.dangerouslyPasteHTML(0, incoming);
      lastSentRef.current = editor.root.innerHTML;
      setCount(editor.getText().trim().length);
    }
  }, [value]);

  return (
    <div className="rich-text" style={{ "--rt-min": minHeight + "px" } as CSSProperties}>
      <div ref={hostRef} />
      {maxLength ? (
        <div className="rich-text-foot">
          <span className={count > maxLength ? "rich-text-over" : ""}>
            {count} / {maxLength} caracteres
          </span>
        </div>
      ) : null}
    </div>
  );
}
