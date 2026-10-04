"use client";

import { useEffect, useRef, useState } from "react";
import "@univerjs/preset-sheets-core/lib/index.css";
import { createClient } from "@/lib/supabase/client";
import { projectSessions, type Workbook } from "@/lib/syllabus/projection";

type Props = { syllabusId: string; initialSnapshot: Record<string, unknown> | null };

const headers = [
  "SEMANA", "N.º DE ACTIVIDAD", "FECHA", "ACTIVIDADES DOCENTE",
  "FORMA DE ENSEÑANZA", "TIEMPO", "LUGAR", "EXPERIMENTAL AUTÓNOMO",
  "TRABAJO INDEPENDIENTE", "MEDIOS DE ENSEÑANZA",
];

function makeStarterWorkbook() {
  const cellData: Record<string, Record<string, { v: string }>> = {
    "0": Object.fromEntries(headers.map((label, column) => [String(column), { v: label }])),
  };
  for (let week = 1; week <= 16; week += 1) {
    cellData[String(week)] = { "0": { v: String(week) } };
  }
  const id = crypto.randomUUID();
  const sheetId = crypto.randomUUID();
  return {
    id,
    name: "Anexo 1 · Plan calendario",
    sheetOrder: [sheetId],
    sheets: {
      [sheetId]: {
        id: sheetId,
        name: "Plan calendario",
        rowCount: 120,
        columnCount: headers.length,
        defaultColumnWidth: 140,
        defaultRowHeight: 42,
        cellData,
      },
    },
  };
}

export default function SyllabusWorkbook({ syllabusId, initialSnapshot }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;
    let instance: any;
    let disposed = false;

    const mount = async () => {
      const [presetModule, localeModule, presetsModule] = await Promise.all([
        import("@univerjs/preset-sheets-core"),
        import("@univerjs/preset-sheets-core/locales/es-ES"),
        import("@univerjs/presets"),
      ]);
      if (disposed) return;
      const { UniverSheetsCorePreset } = presetModule;
      const UniverPresetSheetsCoreesES = localeModule.default;
      const { createUniver, LocaleType, mergeLocales } = presetsModule;
      const { univer, univerAPI } = createUniver({
        locale: LocaleType.ES_ES,
        locales: {
          [LocaleType.ES_ES]: mergeLocales(UniverPresetSheetsCoreesES),
        },
        presets: [UniverSheetsCorePreset({ container: host })],
      });
      instance = univer;
      apiRef.current = univerAPI;
      const snapshot = initialSnapshot && Object.keys(initialSnapshot).length
        ? initialSnapshot
        : makeStarterWorkbook();
      univerAPI.createWorkbook(snapshot as any);
      if (!disposed) setReady(true);
    };
    void mount();

    return () => {
      disposed = true;
      queueMicrotask(() => instance?.dispose());
      apiRef.current = null;
    };
  }, [initialSnapshot]);

  async function handleSave() {
    const snapshot = apiRef.current?.getActiveWorkbook()?.save();
    if (!snapshot) return;
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.rpc("save_syllabus_workbook", {
      target_syllabus_id: syllabusId,
      workbook_data: snapshot,
      activity_rows: projectSessions(snapshot as Workbook),
    });
    setSaving(false);
    if (error) setMessage("No se pudo guardar: " + error.message);
    else setMessage("Cambios guardados. Los temas con fecha ya pueden usarse en los planes de clase.");
  }

  return (
    <section className="workbook-panel">
      <div className="workbook-toolbar">
        <div><span className="tiny-label">ANEXO 1 · PLAN CALENDARIO</span><h2>Planifica tus 16 semanas</h2>
          <p>Modifica la matriz como una hoja de cálculo. Agrega filas y columnas desde la barra del editor.</p></div>
        <div className="workbook-actions"><span className={"save-status " + (message.startsWith("No") ? "save-error" : "")}>{message || (ready ? "Guardado manual" : "Preparando hoja…")}</span>
          <button className="button button-primary" type="button" onClick={handleSave} disabled={!ready || saving}>
            {saving ? "Guardando…" : "Guardar cambios"} <span>✓</span>
          </button>
        </div>
      </div>
      <div className="sheet-hint"><span>i</span> La columna FECHA conecta cada actividad con el plan de clase de ese día. Las 16 filas iniciales corresponden a las semanas del período.</div>
      <div className="sheet-host" ref={containerRef} />
    </section>
  );
}
