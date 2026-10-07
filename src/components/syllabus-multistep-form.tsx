"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import RichText from "@/components/rich-text";
import { SYLLABUS_STEPS, ROMAN, sectionCompletion } from "@/lib/syllabus/sections";

type Props = {
  syllabusId: string;
  initialContent: Record<string, unknown>;
  children?: React.ReactNode; // Anexo 1: matriz (workbook) que se muestra en el paso XII
};

type SaveState = "idle" | "saving" | "saved" | "error";

const EVALUATION_CHOICES: Record<string, string[]> = {
  classroom_activities: ["Resumen de clase", "Talleres teóricos", "Mesas de trabajo", "Debates", "Seminarios", "Participación en el aula", "Proyectos en aula"],
  independent_activities: ["Ensayos", "Resúmenes", "Exposiciones", "Presentaciones digitales", "Revisiones bibliográficas"],
  practical_activities: ["Maquetas", "Experimentos", "Socializaciones", "Talleres prácticos", "Visitas técnicas", "Aplicación de instrumentos", "Dramatizaciones", "Resolución de problemas prácticos"],
  summative_activities: ["Cuestionarios", "Pruebas orales", "Pruebas escritas", "Pruebas virtuales", "Actividades prácticas o experimentales"],
};

const SCORE_LABELS = [
  "Actividades en el aula de clase",
  "Actividades de refuerzo académico",
  "Actividades prácticas y experimentales",
  "Evaluación",
];

function get(obj: Record<string, unknown>, path: (string | number)[], fallback: unknown = ""): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur == null || typeof cur !== "object") return fallback;
    cur = (cur as Record<string, unknown>)[String(key)];
  }
  return cur ?? fallback;
}

function setPath(obj: Record<string, unknown>, path: (string | number)[], value: unknown): Record<string, unknown> {
  const clone: Record<string, unknown> = Array.isArray(obj) ? [...(obj as unknown[])] as unknown as Record<string, unknown> : { ...obj };
  let cur = clone as Record<string, unknown>;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = String(path[i]);
    const next = cur[key];
    const copy = Array.isArray(next) ? [...(next as unknown[])] : { ...((next as Record<string, unknown>) ?? {}) };
    cur[key] = copy as unknown;
    cur = copy as Record<string, unknown>;
  }
  cur[String(path[path.length - 1])] = value;
  return clone;
}

// Mantiene sincronizadas las claves históricas para no romper documentos existentes.
function withLegacySync(content: Record<string, unknown>) {
  const out = { ...content };
  try {
    const cg = content.contenidos_generales as { conocimientos: string[]; habilidades: string[]; valores: string[] };
    const ud = content.unidades_didacticas as { unidades: Array<Record<string, string>> };
    const pt = content.plan_tematico as { unidades: Array<Record<string, unknown>> };
    if (cg && ud && pt && Array.isArray(pt.unidades)) {
      const units = [0, 1, 2, 3].map((i) => {
        const hours = (pt.unidades[i] ?? {}) as Record<string, number>;
        const teacher = ["C", "CP", "S", "T", "L", "E"].reduce((s, k) => s + Number(hours[k] ?? 0), 0);
        return {
          title: ud.unidades?.[i]?.titulo || "Unidad " + ROMAN[i],
          knowledge: ud.unidades?.[i]?.conocimientos || cg.conocimientos?.[i] || "",
          skills: ud.unidades?.[i]?.habilidades || cg.habilidades?.[i] || "",
          values: ud.unidades?.[i]?.valores || cg.valores?.[i] || "",
          hours: {
            C: hours.C ?? 0, CP: hours.CP ?? 0, S: hours.S ?? 0, T: hours.T ?? 0,
            L: hours.L ?? 0, E: hours.E ?? 0,
            THP_autonomous: hours.THP_aut ?? 0, TI: hours.TI ?? 0,
          },
          hours_with_teacher: teacher,
          total_hours: teacher + Number(hours.THP_aut ?? 0) + Number(hours.TI ?? 0),
        };
      });
      (out as Record<string, unknown>).unidades = {
        units,
        calculated_totals: {
          hours_with_teacher: units.reduce((s, u) => s + u.hours_with_teacher, 0),
          THP_autonomous: units.reduce((s, u) => s + Number((u.hours as Record<string, number>).THP_autonomous ?? 0), 0),
          TI: units.reduce((s, u) => s + Number((u.hours as Record<string, number>).TI ?? 0), 0),
          total: units.reduce((s, u) => s + u.total_hours, 0),
        },
      };
    }
    const rec = content.recursos as Record<string, string>;
    const bib = content.bibliografia as Record<string, string>;
    if (rec || bib) {
      (out as Record<string, unknown>).recursos_bibliografia = {
        basic_resources: rec?.basicos ?? "",
        audiovisual_resources: rec?.audiovisuales ?? "",
        technical_resources: rec?.tecnicos ?? "",
        basic_bibliography: bib?.basica ?? "",
        reference_bibliography: bib?.consulta ?? "",
      };
    }
    // La fundamentación histórica espera specific_objectives como texto:
    const obj = (content.objetivos_especificos as { objetivos?: string[] } | undefined)?.objetivos;
    const fund = { ...((content.fundamentacion as Record<string, unknown>) ?? {}) };
    if (Array.isArray(obj)) fund.specific_objectives = obj.filter(Boolean).join("\n");
    const ev = { ...((content.evaluacion as Record<string, unknown>) ?? {}) };
    if (typeof ev.diagnostica === "string") ev.diagnostic = ev.diagnostica;
    if (typeof ev.formativa_desc === "string") ev.formative = ev.formativa_desc;
    if (typeof ev.final_desc === "string") ev.final = ev.final_desc;
    out.fundamentacion = fund;
    out.evaluacion = ev;
  } catch {
    // no bloquear el guardado
  }
  return out;
}

export default function SyllabusMultiStepForm({ syllabusId, initialContent, children }: Props) {
  const [content, setContent] = useState<Record<string, unknown>>(initialContent);
  const [step, setStep] = useState(() => {
    try {
      if (typeof window === "undefined") return 0;
      const raw = window.localStorage.getItem("silabo-step-" + syllabusId);
      const n = Number(raw);
      if (Number.isInteger(n) && n >= 0 && n < SYLLABUS_STEPS.length) return n;
    } catch { /* noop */ }
    return 0;
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSaved, setLastSaved] = useState<string>("");
  const [saveError, setSaveError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(content);
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const persistStep = (n: number) => {
    setStep(n);
    try {
      localStorage.setItem("silabo-step-" + syllabusId, String(n));
    } catch { /* noop */ }
    document.getElementById("silabo-form-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const doSave = useCallback(async () => {
    setSaveState("saving");
    setSaveError("");
    try {
      const supabase = createClient();
      const payload = withLegacySync(contentRef.current);
      const { error } = await supabase.from("syllabi").update({ content: payload }).eq("id", syllabusId);
      if (error) throw error;
      setSaveState("saved");
      setLastSaved(new Date().toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (err) {
      setSaveState("error");
      setSaveError(err instanceof Error ? err.message : "No se pudo guardar automáticamente.");
    }
  }, [syllabusId]);

  const scheduleSave = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setSaveState("saving");
    timer.current = setTimeout(() => void doSave(), 800);
  }, [doSave]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Guardar al salir si hay cambios pendientes.
  useEffect(() => {
    const flush = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
        void doSave();
      }
    };
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, [doSave]);

  const update = useCallback(
    (path: (string | number)[], value: unknown) => {
      setContent((prev) => setPath(prev, path, value));
      scheduleSave();
    },
    [scheduleSave],
  );

  const toggleChoice = useCallback(
    (field: string, value: string) => {
      const current = (get(contentRef.current, ["evaluacion", field], []) as string[]) ?? [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      update(["evaluacion", field], next);
    },
    [update],
  );

  const completion = useMemo(() => sectionCompletion(content), [content]);
  const globalProgress = useMemo(() => {
    const vals = Object.values(completion);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }, [completion]);

  const evalTotals = useMemo(() => {
    const dist = (get(content, ["evaluacion", "point_distribution"], []) as Array<{ first_partial: number; second_partial: number }>) ?? [];
    const first = dist.reduce((s, r) => s + Number(r.first_partial ?? 0), 0);
    const second = dist.reduce((s, r) => s + Number(r.second_partial ?? 0), 0);
    return { first: Math.round(first * 10) / 10, second: Math.round(second * 10) / 10 };
  }, [content]);

  const planTotals = useMemo(() => {
    const rows = (get(content, ["plan_tematico", "unidades"], []) as Array<Record<string, number>>) ?? [];
    const sum = (k: string) => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0);
    const doc = ["C", "CP", "S", "T", "L", "E"].reduce((s, k) => s + sum(k), 0);
    const aut = sum("THP_aut");
    const ti = sum("TI");
    return { C: sum("C"), CP: sum("CP"), S: sum("S"), T: sum("T"), L: sum("L"), E: sum("E"), doc, aut, ti, total: doc + aut + ti };
  }, [content]);

  const current = SYLLABUS_STEPS[step];

  const statusLabel =
    saveState === "saving" ? "Guardando…" :
    saveState === "error" ? "Error al guardar" :
    saveState === "saved" ? `Guardado ${lastSaved}` : "Autoguardado activo";

  return (
    <div id="silabo-form-top" className="multistep-layout">
      {/* Barra de autoguardado compacta */}
      <div className={"autosave-slim autosave-" + saveState} role="status">
        <span className="autosave-dot" aria-hidden="true" />
        <strong>{statusLabel}</strong>
        {saveError ? <small className="save-error">{saveError}</small> : null}
        <span className="autosave-spacer" />
        <span className="autosave-pct">{globalProgress}%</span>
        <span className="autosave-track"><span className="autosave-fill" style={{ width: globalProgress + "%" }} /></span>
      </div>

      <div className="multistep-grid">
        {/* Navegador de pasos */}
        <nav className="stepper" aria-label="Secciones del sílabo">
          {SYLLABUS_STEPS.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => persistStep(i)}
              className={"step-item" + (i === step ? " step-active" : "") + (completion[s.key] >= 100 ? " step-done" : "")}
            >
              <span className="step-roman">{s.index}</span>
              <span className="step-copy">
                <strong>{s.title}</strong>
                <small>{completion[s.key] ?? 0}% · {s.subtitle}</small>
              </span>
              {completion[s.key] >= 100 ? <b className="step-check">✓</b> : null}
            </button>
          ))}
        </nav>

        {/* Panel del paso actual */}
        <section className="surface-card step-panel">
          <div className="step-panel-head">
            <span className="step-index">{current.index}</span>
            <div>
              <span className="tiny-label">SECCIÓN {current.index} DE XII · {completion[current.key] ?? 0}%</span>
              <h2>{current.title}</h2>
              <p>{current.subtitle}</p>
            </div>
          </div>

          {step === 0 && <StepDatos content={content} update={update} />}
          {step === 1 && <StepFundamentacion content={content} update={update} />}
          {step === 2 && <StepObjetivos content={content} update={update} />}
          {step === 3 && (
            <StepEvaluacion content={content} update={update} toggleChoice={toggleChoice} totals={evalTotals} />
          )}
          {step === 4 && <StepContenidos content={content} update={update} />}
          {step === 5 && <StepPlanTematico content={content} update={update} totals={planTotals} />}
          {step === 6 && <StepUnidades content={content} update={update} />}
          {step === 7 && <StepMetodologia content={content} update={update} />}
          {step === 8 && <StepRecursos content={content} update={update} />}
          {step === 9 && <StepBibliografia content={content} update={update} />}
          {step === 10 && <StepFirmas content={content} update={update} />}
          {step === 11 && <StepAnexo content={content} update={update}>{children}</StepAnexo>}

          <div className="step-nav">
            <button type="button" className="button button-outline" disabled={step === 0} onClick={() => persistStep(Math.max(0, step - 1))}>
              ← Anterior
            </button>
            <span className="step-counter">{current.index} / XII</span>
            {step < SYLLABUS_STEPS.length - 1 ? (
              <button type="button" className="button button-primary" onClick={() => persistStep(Math.min(SYLLABUS_STEPS.length - 1, step + 1))}>
                Siguiente →
              </button>
            ) : (
              <a className="button button-primary" href={"/docente/silabo/" + syllabusId}>Volver al sílabo ✓</a>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------- Campos reutilizables ---------- */

function Text({
  label, value, onChange, rows = 3, placeholder = "", type = "text", maxLength,
}: {
  label: string; value: unknown; onChange: (v: string) => void; rows?: number; placeholder?: string; type?: string; maxLength?: number;
}) {
  const v = String(value ?? "");
  if (type === "number") {
    return (
      <label className="ms-field"><span>{label}</span>
        <input type="number" min={0} step="any" value={v} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      </label>
    );
  }
  if (rows <= 1) {
    return (
      <label className="ms-field"><span>{label}</span>
        <input type="text" value={v} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      </label>
    );
  }
  return (
    <div className="ms-field ms-field-long"><span className="ms-field-label">{label}</span>
      <RichText
        value={v}
        onChange={onChange}
        placeholder={placeholder}
        minHeight={rows >= 5 ? 180 : rows === 4 ? 150 : rows === 3 ? 130 : 100}
        maxLength={maxLength}
      />
    </div>
  );
}

/* ---------- Pasos ---------- */

function StepDatos({ content, update }: { content: Record<string, unknown>; update: (p: (string | number)[], v: unknown) => void }) {
  const f = (k: string) => String(get(content, ["datos_informativos", k], "") ?? "");
  const set = (k: string) => (v: string) => update(["datos_informativos", k], v);
  const setNum = (k: string) => (v: string) => update(["datos_informativos", k], Number(v) || 0);
  return (
    <div className="ms-grid">
      <p className="ms-note">Corresponde a <strong>I. DATOS INFORMATIVOS</strong> del Word. Los valores iniciales se prellenan con la oferta académica; corrige aquí lo que el documento requiera.</p>
      <div className="ms-grid-2">
        <Text label="Carrera" value={f("carrera")} onChange={set("carrera")} rows={1} />
        <Text label="Código de carrera" value={f("codigo_carrera")} onChange={set("codigo_carrera")} rows={1} />
        <Text label="Estado de la carrera" value={f("estado_carrera")} onChange={set("estado_carrera")} rows={1} />
        <Text label="Nivel de formación" value={f("nivel_formacion")} onChange={set("nivel_formacion")} rows={1} />
        <Text label="Ajuste sustantivo" value={f("ajuste_sustantivo")} onChange={set("ajuste_sustantivo")} rows={1} />
        <Text label="Ajuste no sustantivo" value={f("ajuste_no_sustantivo")} onChange={set("ajuste_no_sustantivo")} rows={1} />
        <Text label="Nombre de la asignatura" value={f("nombre_asignatura")} onChange={set("nombre_asignatura")} rows={1} />
        <Text label="Código de asignatura" value={f("codigo_asignatura")} onChange={set("codigo_asignatura")} rows={1} />
        <Text label="Pre-requisito" value={f("prerequisito")} onChange={set("prerequisito")} rows={1} />
        <Text label="Co-requisito" value={f("corequisito")} onChange={set("corequisito")} rows={1} />
        <Text label="Semestre / nivel" value={f("semestre")} onChange={set("semestre")} rows={1} />
        <Text label="Paralelo – jornada" value={f("paralelo")} onChange={set("paralelo")} rows={1} placeholder="A - Nocturno" />
        <Text label="Período académico" value={f("periodo_academico")} onChange={set("periodo_academico")} rows={1} placeholder="Mayo – Septiembre 2026 (IPA 2026)" />
        <Text label="Modalidad" value={f("modalidad")} onChange={set("modalidad")} rows={1} />
        <Text label="Docente responsable" value={f("docente_responsable")} onChange={set("docente_responsable")} rows={1} />
        <Text label="Total de horas" value={f("total_horas")} onChange={setNum("total_horas")} type="number" />
        <Text label="Componente docencia (h)" value={f("horas_docencia")} onChange={setNum("horas_docencia")} type="number" />
        <Text label="Práctico experimental con docente (h)" value={f("horas_practico_docente")} onChange={setNum("horas_practico_docente")} type="number" />
        <Text label="Práctico experimental autónomo (h)" value={f("horas_practico_autonomo")} onChange={setNum("horas_practico_autonomo")} type="number" />
        <Text label="Aprendizaje autónomo (h)" value={f("horas_autonomo")} onChange={setNum("horas_autonomo")} type="number" />
      </div>
    </div>
  );
}

function StepFundamentacion({ content, update }: { content: Record<string, unknown>; update: (p: (string | number)[], v: unknown) => void }) {
  const f = (k: string) => String(get(content, ["fundamentacion", k], "") ?? "");
  const set = (k: string) => (v: string) => update(["fundamentacion", k], v);
  return (
    <div className="ms-grid">
      <p className="ms-note">Corresponde a <strong>II. FUNDAMENTACIÓN</strong>: redacta en el primer cuadro la importancia de la asignatura, su aporte como base de áreas especializadas, las conclusiones y el perfil profesional.</p>
      <Text
        label="Fundamentación de la asignatura"
        value={f("fundamentacion_texto")}
        onChange={set("fundamentacion_texto")}
        rows={8}
        maxLength={10000}
        placeholder="Importancia de la asignatura en un mundo interconectado, base para áreas especializadas, conclusión y perfil profesional del tecnólogo…"
      />
      <Text label="Consecución al perfil de egreso" value={f("profile_contribution")} onChange={set("profile_contribution")} rows={4} />
      <Text label="Aporte a otras asignaturas (pre/co-requisitos)" value={f("other_subjects_contribution")} onChange={set("other_subjects_contribution")} rows={4} />
      <Text label="Capacidades generales para el aprendizaje" value={f("general_capabilities")} onChange={set("general_capabilities")} rows={4} />
      <Text label="Contribución a la formación cultural general" value={f("cultural_formation")} onChange={set("cultural_formation")} rows={4} />
      <div className="ms-grid-3">
        <Text label="Problema de la asignatura" value={f("problem")} onChange={set("problem")} rows={3} />
        <Text label="Objeto de estudio" value={f("study_object")} onChange={set("study_object")} rows={3} />
        <Text label="Objetivo general" value={f("general_objective")} onChange={set("general_objective")} rows={3} />
      </div>
    </div>
  );
}

function StepObjetivos({ content, update }: { content: Record<string, unknown>; update: (p: (string | number)[], v: unknown) => void }) {
  const objetivos = (get(content, ["objetivos_especificos", "objetivos"], ["", "", "", ""]) as string[]) ?? [];
  return (
    <div className="ms-grid">
      <p className="ms-note">Corresponde a <strong>III. OBJETIVOS ESPECÍFICOS</strong>: un objetivo por unidad. Incluye verbo, contenido, finalidad y valor.</p>
      {[0, 1, 2, 3].map((i) => (
        <Text
          key={i}
          label={"Objetivo específico — Unidad " + ROMAN[i]}
          value={objetivos[i] ?? ""}
          onChange={(v) => {
            const next = [...objetivos];
            while (next.length < 4) next.push("");
            next[i] = v;
            update(["objetivos_especificos", "objetivos"], next);
          }}
          rows={3}
        />
      ))}
    </div>
  );
}

function StepEvaluacion({
  content, update, toggleChoice, totals,
}: {
  content: Record<string, unknown>; update: (p: (string | number)[], v: unknown) => void;
  toggleChoice: (f: string, v: string) => void; totals: { first: number; second: number };
}) {
  const f = (k: string) => String(get(content, ["evaluacion", k], "") ?? "");
  const set = (k: string) => (v: string) => update(["evaluacion", k], v);
  const dist = (get(content, ["evaluacion", "point_distribution"], []) as Array<{ label: string; first_partial: number; second_partial: number }>) ?? [];
  const porObj = (get(content, ["evaluacion", "por_objetivo"], ["", "", "", ""]) as string[]) ?? [];
  const over = totals.first > 10 || totals.second > 10;
  return (
    <div className="ms-grid">
      <p className="ms-note">Corresponde a <strong>IV. SISTEMA DE EVALUACIÓN</strong>. La suma de cada parcial se valida sobre 10 puntos (tabla del Word).</p>
      <Text label="Introducción del sistema de evaluación" value={f("introduccion")} onChange={set("introduccion")} rows={3} />
      <div className="ms-grid-3">
        <Text label="Evaluación diagnóstica" value={f("diagnostica") || f("diagnostic")} onChange={(v) => { update(["evaluacion", "diagnostica"], v); update(["evaluacion", "diagnostic"], v); }} rows={3} />
        <Text label="Evaluación formativa" value={f("formativa_desc") || f("formative")} onChange={(v) => { update(["evaluacion", "formativa_desc"], v); update(["evaluacion", "formative"], v); }} rows={3} />
        <Text label="Evaluación final" value={f("final_desc") || f("final")} onChange={(v) => { update(["evaluacion", "final_desc"], v); update(["evaluacion", "final"], v); }} rows={3} />
      </div>
      <Text label="Criterios de evaluación formativa" value={f("formative_criteria")} onChange={set("formative_criteria")} rows={3} />
      {[0, 1, 2, 3].map((i) => (
        <Text
          key={i}
          label={"Cómo se evalúa el objetivo " + ROMAN[i]}
          value={porObj[i] ?? ""}
          onChange={(v) => {
            const next = [...porObj];
            while (next.length < 4) next.push("");
            next[i] = v;
            update(["evaluacion", "por_objetivo"], next);
          }}
          rows={2}
        />
      ))}
      {Object.entries(EVALUATION_CHOICES).map(([field, values]) => (
        <div key={field} className="evaluation-choice-group">
          <h3>{field === "classroom_activities" ? "Actividades en el aula (20% · 2 pt)" : field === "independent_activities" ? "Refuerzo académico (30% · 3 pt)" : field === "practical_activities" ? "Prácticas y experimentales (30% · 3 pt)" : "Evaluación sumativa (20% · 2 pt)"}</h3>
          <div className="choice-grid">
            {values.map((v) => {
              const selected = ((get(content, ["evaluacion", field], []) as string[]) ?? []).includes(v);
              return (
                <label key={v} className="choice-option">
                  <input type="checkbox" checked={selected} onChange={() => toggleChoice(field, v)} />
                  <span>{v}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
      <div className="evaluation-choice-group">
        <h3>Puntaje por parcial (sobre 10)</h3>
        {over && <p className="form-error">La ponderación supera 10 puntos. Ajusta los valores: actual {totals.first} / {totals.second}.</p>}
        <div className="score-grid score-head"><span>Criterio</span><span>Primer parcial</span><span>Segundo parcial</span></div>
        {SCORE_LABELS.map((label, i) => (
          <div className="score-grid" key={label}>
            <strong>{label}</strong>
            <input
              type="number" step="0.1" min={0} max={10}
              value={Number(dist[i]?.first_partial ?? "")}
              onChange={(e) => {
                const next = [...dist];
                while (next.length < 4) next.push({ label: SCORE_LABELS[next.length], first_partial: 0, second_partial: 0 });
                next[i] = { ...next[i], label, first_partial: Number(e.target.value) || 0 };
                update(["evaluacion", "point_distribution"], next);
                update(["evaluacion", "first_partial_total"], next.reduce((s, r) => s + Number(r.first_partial ?? 0), 0));
                update(["evaluacion", "second_partial_total"], next.reduce((s, r) => s + Number(r.second_partial ?? 0), 0));
              }}
            />
            <input
              type="number" step="0.1" min={0} max={10}
              value={Number(dist[i]?.second_partial ?? "")}
              onChange={(e) => {
                const next = [...dist];
                while (next.length < 4) next.push({ label: SCORE_LABELS[next.length], first_partial: 0, second_partial: 0 });
                next[i] = { ...next[i], label, second_partial: Number(e.target.value) || 0 };
                update(["evaluacion", "point_distribution"], next);
                update(["evaluacion", "first_partial_total"], next.reduce((s, r) => s + Number(r.first_partial ?? 0), 0));
                update(["evaluacion", "second_partial_total"], next.reduce((s, r) => s + Number(r.second_partial ?? 0), 0));
              }}
            />
          </div>
        ))}
        <p className="field-help">Totales: primer parcial {totals.first} / 10 · segundo parcial {totals.second} / 10.</p>
      </div>
      <Text label="Escala institucional (referencia)" value={f("escala_institucional")} onChange={set("escala_institucional")} rows={2} />
      <Text label="Reglas de recuperación (nota mínima, ponderación 50%, tope 8/10)" value={f("reglas_recuperacion")} onChange={set("reglas_recuperacion")} rows={3} />
      <Text label="Segundo parcial — proyecto de vinculación (5 pt documento + 5 pt defensa)" value={f("vinculacion_segundo_parcial")} onChange={set("vinculacion_segundo_parcial")} rows={3} />
    </div>
  );
}

function StepContenidos({ content, update }: { content: Record<string, unknown>; update: (p: (string | number)[], v: unknown) => void }) {
  const cg = get(content, ["contenidos_generales"], {}) as { conocimientos: string[]; habilidades: string[]; valores: string[] };
  const setArr = (field: string, i: number) => (v: string) => {
    const next = [...((cg as Record<string, string[]>)[field] ?? ["", "", "", ""])];
    while (next.length < 4) next.push("");
    next[i] = v;
    update(["contenidos_generales", field], next);
  };
  return (
    <div className="ms-grid">
      <p className="ms-note">Corresponde a <strong>V. CONTENIDOS</strong> (sistemas generales por unidad, resumen de una línea por celda).</p>
      {[0, 1, 2, 3].map((i) => (
        <fieldset key={i} className="ms-fieldset">
          <legend>Unidad {ROMAN[i]}</legend>
          <Text label="Sistema general de conocimientos" value={cg.conocimientos?.[i] ?? ""} onChange={setArr("conocimientos", i)} rows={2} />
          <Text label="Sistema general de habilidades" value={cg.habilidades?.[i] ?? ""} onChange={setArr("habilidades", i)} rows={2} />
          <Text label="Sistema general de valores" value={cg.valores?.[i] ?? ""} onChange={setArr("valores", i)} rows={2} />
        </fieldset>
      ))}
    </div>
  );
}

function StepPlanTematico({
  content, update, totals,
}: {
  content: Record<string, unknown>; update: (p: (string | number)[], v: unknown) => void;
  totals: { C: number; CP: number; S: number; T: number; L: number; E: number; doc: number; aut: number; ti: number; total: number };
}) {
  const rows = (get(content, ["plan_tematico", "unidades"], []) as Array<Record<string, unknown>>) ?? [];
  const cols: Array<[string, string]> = [["C", "C"], ["CP", "CP"], ["S", "S"], ["T", "T"], ["L", "L"], ["E", "E"], ["THP_aut", "THP Aut"], ["TI", "TI"]];
  const setCell = (i: number, k: string, v: string) => {
    const next = [...rows];
    const row = { ...(next[i] ?? {}) } as Record<string, unknown>;
    if (k === "tema") row.tema = v;
    else row[k] = Number(v) || 0;
    const doc = ["C", "CP", "S", "T", "L", "E"].reduce((s, key) => s + Number(row[key] ?? 0), 0);
    row.THP_doc = doc;
    next[i] = row;
    update(["plan_tematico", "unidades"], next);
  };
  return (
    <div className="ms-grid">
      <p className="ms-note">Corresponde a <strong>VI. PLAN TEMÁTICO</strong> (Tabla 2 del Word). D+THP (Doc) se calcula solo: C+CP+S+T+L+E.</p>
      <div className="ms-table-wrap">
        <table className="ms-table">
          <thead>
            <tr><th>Tema de la asignatura</th>{cols.map(([k, l]) => (<th key={k}>{l}</th>))}<th>Doc</th><th>THA</th></tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3].map((i) => {
              const r = (rows[i] ?? {}) as Record<string, number & string>;
              const doc = ["C", "CP", "S", "T", "L", "E"].reduce((s, k) => s + Number(r[k] ?? 0), 0);
              const tha = doc + Number(r.THP_aut ?? 0) + Number(r.TI ?? 0);
              return (
                <tr key={i}>
                  <td><input value={String(r.tema ?? "")} placeholder={"Unidad " + ROMAN[i]} onChange={(e) => setCell(i, "tema", e.target.value)} /></td>
                  {cols.map(([k]) => (
                    <td key={k}><input type="number" min={0} value={Number(r[k] ?? 0)} onChange={(e) => setCell(i, k, e.target.value)} /></td>
                  ))}
                  <td className="ms-total">{doc}</td>
                  <td className="ms-total">{tha}</td>
                </tr>
              );
            })}
            <tr className="ms-total-row">
              <td><strong>TOTAL HORAS</strong></td>
              <td>{totals.C}</td><td>{totals.CP}</td><td>{totals.S}</td><td>{totals.T}</td><td>{totals.L}</td><td>{totals.E}</td>
              <td>{totals.doc}</td><td>{totals.total}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="field-help">Leyenda: C Conferencias · S Seminarios · CP Clases prácticas · T Taller · L Laboratorio · E Evaluación · D Componente docencia · THP (Doc/Aut) · TI Trabajo independiente · THA Total horas.</p>
      <div className="ms-grid-2">
        <Text label="Evaluación primer parcial (h)" value={String(get(content, ["plan_tematico", "evaluacion_parcial_1"], 2))} onChange={(v) => update(["plan_tematico", "evaluacion_parcial_1"], Number(v) || 0)} type="number" />
        <Text label="Evaluación segundo parcial (h)" value={String(get(content, ["plan_tematico", "evaluacion_parcial_2"], 2))} onChange={(v) => update(["plan_tematico", "evaluacion_parcial_2"], Number(v) || 0)} type="number" />
      </div>
    </div>
  );
}

function StepUnidades({ content, update }: { content: Record<string, unknown>; update: (p: (string | number)[], v: unknown) => void }) {
  const unidades = (get(content, ["unidades_didacticas", "unidades"], []) as Array<Record<string, string>>) ?? [];
  const setU = (i: number, k: string) => (v: string) => {
    const next = [...unidades];
    next[i] = { ...(next[i] ?? {}), [k]: v };
    update(["unidades_didacticas", "unidades"], next);
  };
  return (
    <div className="ms-grid">
      <p className="ms-note">Corresponde a <strong>VII. SISTEMA DE CONTENIDOS POR UNIDADES DIDÁCTICAS</strong> (Tablas 3–6 del Word).</p>
      {[0, 1, 2, 3].map((i) => (
        <fieldset key={i} className="ms-fieldset">
          <legend>Unidad {ROMAN[i]}</legend>
          <Text label="Título de la unidad" value={unidades[i]?.titulo ?? ""} onChange={setU(i, "titulo")} rows={1} />
          <Text label="Objetivo de la unidad" value={unidades[i]?.objetivo ?? ""} onChange={setU(i, "objetivo")} rows={3} />
          <Text label="Sistema de conocimientos (un tema por línea)" value={unidades[i]?.conocimientos ?? ""} onChange={setU(i, "conocimientos")} rows={4} />
          <Text label="Sistema de habilidades" value={unidades[i]?.habilidades ?? ""} onChange={setU(i, "habilidades")} rows={4} />
          <Text label="Sistema de valores" value={unidades[i]?.valores ?? ""} onChange={setU(i, "valores")} rows={2} />
        </fieldset>
      ))}
      <Text label="Nota sobre prácticas" value={String(get(content, ["unidades_didacticas", "nota_practicas"], ""))} onChange={(v) => update(["unidades_didacticas", "nota_practicas"], v)} rows={2} />
    </div>
  );
}

function StepMetodologia({ content, update }: { content: Record<string, unknown>; update: (p: (string | number)[], v: unknown) => void }) {
  const f = (k: string) => String(get(content, ["metodologia", k], "") ?? "");
  const set = (k: string) => (v: string) => update(["metodologia", k], v);
  return (
    <div className="ms-grid">
      <p className="ms-note">Corresponde a <strong>VIII. ORIENTACIONES METODOLÓGICAS Y DE ORGANIZACIÓN</strong>. Cada subtítulo del Word es un campo.</p>
      <label className="ms-field"><span>Relación con el modelo educativo (enfoque)</span>
        <select value={f("educational_model")} onChange={(e) => set("educational_model")(e.target.value)}>
          <option value="">Selecciona</option>
          <option>Constructivista</option>
          <option>Conectivista</option>
          <option>Aprendizaje basado en competencias</option>
          <option>Zona de Desarrollo Próximo (ZDP)</option>
          <option>Otro</option>
        </select>
      </label>
      <Text label="Relación con el modelo educativo (desarrollo)" value={f("relacion_modelo")} onChange={set("relacion_modelo")} rows={5} />
      <Text label="Interrelación teoría – práctica" value={f("theory_practice")} onChange={set("theory_practice")} rows={4} />
      <Text label="Métodos y técnicas (ABP, casos, simulación, cooperativo…)" value={f("metodos_teoria_practica")} onChange={set("metodos_teoria_practica")} rows={4} />
      <Text label="Acciones para la motivación de los estudiantes" value={f("student_motivation")} onChange={set("student_motivation")} rows={4} />
      <Text label="Desarrollo del pensamiento crítico" value={f("critical_thinking")} onChange={set("critical_thinking")} rows={4} />
      <Text label="Técnicas participativas (debates, roles, lluvia de ideas…)" value={f("tecnicas_participativas")} onChange={set("tecnicas_participativas")} rows={4} />
      <Text label="Capacidades generales para el aprendizaje" value={f("learning_capacities")} onChange={set("learning_capacities")} rows={4} />
      <Text label="Atención a necesidades educativas (Art. 68 RRA)" value={f("inclusive_learning")} onChange={set("inclusive_learning")} rows={4} />
      <Text label="Organización: planificación, notificación, tutorías y adaptaciones" value={f("atencion_necesidades")} onChange={set("atencion_necesidades")} rows={4} />
      <Text label="Orientación del trabajo autónomo" value={f("autonomous_work")} onChange={set("autonomous_work")} rows={4} />
      <Text label="Apoyo: guía de estudios, plataforma y retroalimentación" value={f("orientacion_autonomo_detalle")} onChange={set("orientacion_autonomo_detalle")} rows={4} />
    </div>
  );
}

function StepRecursos({ content, update }: { content: Record<string, unknown>; update: (p: (string | number)[], v: unknown) => void }) {
  const f = (k: string) => String(get(content, ["recursos", k], "") ?? "");
  const set = (k: string) => (v: string) => update(["recursos", k], v);
  return (
    <div className="ms-grid">
      <p className="ms-note">Corresponde a <strong>IX. RECURSOS DIDÁCTICOS</strong>.</p>
      <Text label="Básicos (pizarra, marcadores, borrador…)" value={f("basicos")} onChange={set("basicos")} rows={3} />
      <Text label="Audiovisuales (computadora, proyector, parlantes…)" value={f("audiovisuales")} onChange={set("audiovisuales")} rows={3} />
      <Text label="Técnicos (guía, rúbricas, plataforma, simuladores…)" value={f("tecnicos")} onChange={set("tecnicos")} rows={4} />
    </div>
  );
}

function StepBibliografia({ content, update }: { content: Record<string, unknown>; update: (p: (string | number)[], v: unknown) => void }) {
  const f = (k: string) => String(get(content, ["bibliografia", k], "") ?? "");
  const set = (k: string) => (v: string) => update(["bibliografia", k], v);
  return (
    <div className="ms-grid">
      <p className="ms-note">Corresponde a <strong>X. BIBLIOGRAFÍA BÁSICA Y COMPLEMENTARIA</strong>. Una referencia por línea.</p>
      <Text label="Bibliografía básica" value={f("basica")} onChange={set("basica")} rows={6} placeholder="Apellido, N. (año). Título. Editorial." />
      <Text label="Bibliografía de consulta / complementaria" value={f("consulta")} onChange={set("consulta")} rows={6} />
    </div>
  );
}

function StepFirmas({ content, update }: { content: Record<string, unknown>; update: (p: (string | number)[], v: unknown) => void }) {
  const f = (k: string) => String(get(content, ["firmas", k], "") ?? "");
  const set = (k: string) => (v: string) => update(["firmas", k], v);
  return (
    <div className="ms-grid">
      <p className="ms-note">Corresponde a <strong>XI. FIRMAS DE RESPONSABILIDAD</strong> (Tabla 7 del Word).</p>
      <div className="ms-grid-2">
        <Text label="Elaborado por (nombre)" value={f("elaborado_nombre")} onChange={set("elaborado_nombre")} rows={1} />
        <Text label="Elaborado — cargo" value={f("elaborado_cargo")} onChange={set("elaborado_cargo")} rows={1} />
        <Text label="Revisado por (nombre)" value={f("revisado_nombre")} onChange={set("revisado_nombre")} rows={1} />
        <Text label="Revisado — cargo" value={f("revisado_cargo")} onChange={set("revisado_cargo")} rows={1} />
        <Text label="Aprobado por (nombre)" value={f("aprobado_nombre")} onChange={set("aprobado_nombre")} rows={1} />
        <Text label="Aprobado — cargo" value={f("aprobado_cargo")} onChange={set("aprobado_cargo")} rows={1} />
        <Text label="Ciudad" value={f("ciudad")} onChange={set("ciudad")} rows={1} />
        <Text label="Fecha" value={f("fecha")} onChange={set("fecha")} rows={1} placeholder="04 de mayo de 2026" />
      </div>
    </div>
  );
}

function StepAnexo({
  content, update, children,
}: {
  content: Record<string, unknown>; update: (p: (string | number)[], v: unknown) => void; children?: React.ReactNode;
}) {
  const f = (k: string) => String(get(content, ["anexo1", k], "") ?? "");
  const set = (k: string) => (v: string) => update(["anexo1", k], v);
  const setNum = (k: string) => (v: string) => update(["anexo1", k], Number(v) || 0);
  return (
    <div className="ms-grid">
      <p className="ms-note">Corresponde a <strong>XII. ANEXO 1: PLAN CALENDARIO</strong>. Completa el encabezado; la matriz de semanas se edita abajo (se guarda con su propio botón).</p>
      <div className="ms-grid-2">
        <Text label="Carrera" value={f("carrera")} onChange={set("carrera")} rows={1} />
        <Text label="Código de carrera" value={f("codigo_carrera")} onChange={set("codigo_carrera")} rows={1} />
        <Text label="Ajuste sustantivo" value={f("ajuste_sustantivo")} onChange={set("ajuste_sustantivo")} rows={1} />
        <Text label="Ajuste no sustantivo" value={f("ajuste_no_sustantivo")} onChange={set("ajuste_no_sustantivo")} rows={1} />
        <Text label="Nivel" value={f("nivel")} onChange={set("nivel")} rows={1} />
        <Text label="Modalidad de estudio" value={f("modalidad")} onChange={set("modalidad")} rows={1} />
        <Text label="Nombre de la asignatura" value={f("nombre_asignatura")} onChange={set("nombre_asignatura")} rows={1} />
        <Text label="Código de asignatura" value={f("codigo_asignatura")} onChange={set("codigo_asignatura")} rows={1} />
        <Text label="Nivel de estudios" value={f("nivel_estudios")} onChange={set("nivel_estudios")} rows={1} placeholder="Primero" />
        <Text label="Ciudad y fecha" value={f("ciudad_fecha")} onChange={set("ciudad_fecha")} rows={1} />
        <Text label="Pre-requisito" value={f("prerequisito")} onChange={set("prerequisito")} rows={1} />
        <Text label="Co-requisito" value={f("corequisito")} onChange={set("corequisito")} rows={1} />
        <Text label="Total de horas" value={f("total_horas")} onChange={setNum("total_horas")} type="number" />
        <Text label="Componente teórico (h)" value={f("componente_teorico")} onChange={setNum("componente_teorico")} type="number" />
        <Text label="Práctico experimental con docente (h)" value={f("componente_practico_docente")} onChange={setNum("componente_practico_docente")} type="number" />
        <Text label="Práctico experimental autónomo (h)" value={f("componente_practico_autonomo")} onChange={setNum("componente_practico_autonomo")} type="number" />
        <Text label="Componente autónomo (h)" value={f("componente_autonomo")} onChange={setNum("componente_autonomo")} type="number" />
      </div>
      <div className="ms-workbook-slot">{children}</div>
    </div>
  );
}
