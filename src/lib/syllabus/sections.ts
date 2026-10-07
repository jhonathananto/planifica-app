// Estructura canónica del sílabo (12 secciones) fiel a plantillas/silabo.docx.
// El contenido se guarda en syllabi.content (jsonb). Cada clave es una sección.
// Compatible hacia atrás: reutiliza claves existentes (fundamentacion, evaluacion,
// unidades, metodologia, recursos_bibliografia) y añade las faltantes.

export const SECTION_KEYS = [
  "datos_informativos",
  "fundamentacion",
  "objetivos_especificos",
  "evaluacion",
  "contenidos_generales",
  "plan_tematico",
  "unidades_didacticas",
  "metodologia",
  "recursos",
  "bibliografia",
  "firmas",
  "anexo1",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export type StepDef = {
  key: string;
  index: string; // "I" .. "XII"
  title: string;
  subtitle: string;
};

export const SYLLABUS_STEPS: StepDef[] = [
  { key: "datos_informativos", index: "I", title: "Datos informativos", subtitle: "Identificación de la carrera, asignatura y período" },
  { key: "fundamentacion", index: "II", title: "Fundamentación", subtitle: "Contexto, perfil de egreso y objeto de estudio" },
  { key: "objetivos_especificos", index: "III", title: "Objetivos específicos", subtitle: "Un objetivo por unidad (I – IV)" },
  { key: "evaluacion", index: "IV", title: "Sistema de evaluación", subtitle: "Diagnóstica, formativa, sumativa y ponderación /10" },
  { key: "contenidos_generales", index: "V", title: "Contenidos", subtitle: "Sistemas generales de conocimientos, habilidades y valores" },
  { key: "plan_tematico", index: "VI", title: "Plan temático", subtitle: "Distribución de horas C · CP · S · T · L · E" },
  { key: "unidades_didacticas", index: "VII", title: "Sistema de contenidos por unidades didácticas", subtitle: "Detalle de conocimientos, habilidades y valores por unidad" },
  { key: "metodologia", index: "VIII", title: "Orientaciones metodológicas", subtitle: "Modelo educativo, motivación, inclusión y trabajo autónomo" },
  { key: "recursos", index: "IX", title: "Recursos didácticos", subtitle: "Básicos, audiovisuales y técnicos" },
  { key: "bibliografia", index: "X", title: "Bibliografía básica y complementaria", subtitle: "Una referencia por línea (APA)" },
  { key: "firmas", index: "XI", title: "Firmas de responsabilidad", subtitle: "Elaborado · Revisado · Aprobado + ciudad y fecha" },
  { key: "anexo1", index: "XII", title: "Anexo 1: Plan calendario", subtitle: "Encabezado + matriz de 16 semanas" },
];

export const ROMAN = ["I", "II", "III", "IV"];

// ---- Defaults ---------------------------------------------------------------

export function defaultContent() {
  return {
    datos_informativos: {
      carrera: "", codigo_carrera: "", estado_carrera: "Vigente",
      ajuste_sustantivo: "No aplica", ajuste_no_sustantivo: "No aplica",
      nivel_formacion: "Tecnológico Superior Universitario",
      nombre_asignatura: "", codigo_asignatura: "",
      prerequisito: "No aplica", corequisito: "",
      total_horas: 192, horas_docencia: 48, horas_practico_docente: 48,
      horas_practico_autonomo: 48, horas_autonomo: 48,
      semestre: "", paralelo: "", periodo_academico: "", modalidad: "Presencial",
      docente_responsable: "",
    },
    fundamentacion: {
      introduccion_1: "", introduccion_2: "", introduccion_3: "",
      perfil_profesional: "",
      profile_contribution: "", other_subjects_contribution: "",
      general_capabilities: "", cultural_formation: "",
      problem: "", study_object: "", general_objective: "",
      specific_objectives: "",
    },
    objetivos_especificos: { objetivos: ["", "", "", ""] },
    evaluacion: {
      introduccion: "",
      diagnostica: "", diagnostic: "",
      formativa_desc: "", formative: "",
      final_desc: "", final: "",
      formative_criteria: "",
      por_objetivo: ["", "", "", ""],
      classroom_activities: [] as string[],
      independent_activities: [] as string[],
      practical_activities: [] as string[],
      summative_activities: [] as string[],
      point_distribution: [
        { label: "Actividades en el aula de clase", first_partial: 2, second_partial: 2 },
        { label: "Actividades de refuerzo académico", first_partial: 3, second_partial: 3 },
        { label: "Actividades prácticas y experimentales", first_partial: 3, second_partial: 3 },
        { label: "Evaluación", first_partial: 2, second_partial: 2 },
      ],
      first_partial_total: 10,
      second_partial_total: 10,
      escala_institucional: "10,00 a 9,51 Excelente · 9,50 a 8,51 Muy Bueno · 8,50 a 8,01 Bueno · 8,00 a 7,00 Aprobado · 6,99 o menos Reprobado",
      reglas_recuperacion: "",
      vinculacion_segundo_parcial: "",
    },
    contenidos_generales: {
      conocimientos: ["", "", "", ""],
      habilidades: ["", "", "", ""],
      valores: ["", "", "", ""],
    },
    plan_tematico: {
      unidades: [0, 1, 2, 3].map(() => ({ tema: "", C: 0, CP: 0, S: 0, T: 0, L: 0, E: 0, THP_doc: 0, THP_aut: 0, TI: 0 })),
      evaluacion_parcial_1: 2,
      evaluacion_parcial_2: 2,
    },
    unidades_didacticas: {
      unidades: [0, 1, 2, 3].map((i) => ({
        titulo: "Unidad " + ROMAN[i],
        objetivo: "",
        conocimientos: "",
        habilidades: "",
        valores: "",
      })),
      nota_practicas: "El detalle de la planificación de las prácticas se encuentra en el Anexo 1 Plan Calendario de la Asignatura.",
    },
    metodologia: {
      educational_model: "",
      relacion_modelo: "",
      theory_practice: "",
      metodos_teoria_practica: "",
      student_motivation: "",
      critical_thinking: "",
      tecnicas_participativas: "",
      learning_capacities: "",
      inclusive_learning: "",
      atencion_necesidades: "",
      autonomous_work: "",
      orientacion_autonomo_detalle: "",
    },
    recursos: { basicos: "", audiovisuales: "", tecnicos: "" },
    bibliografia: { basica: "", consulta: "" },
    firmas: {
      elaborado_nombre: "", elaborado_cargo: "Docente",
      revisado_nombre: "", revisado_cargo: "Coordinador/a de Carrera",
      aprobado_nombre: "", aprobado_cargo: "Vicerrector/a",
      ciudad: "Machala", fecha: "",
    },
    anexo1: {
      carrera: "", codigo_carrera: "",
      ajuste_sustantivo: "No aplica", ajuste_no_sustantivo: "No aplica",
      nivel: "Tecnológico Universitario", modalidad: "Presencial",
      nombre_asignatura: "", codigo_asignatura: "", nivel_estudios: "",
      prerequisito: "No aplica", corequisito: "",
      total_horas: 192, componente_teorico: 48,
      componente_practico_docente: 48, componente_practico_autonomo: 48,
      componente_autonomo: 48, ciudad_fecha: "",
    },
    // Clave histórica: se mantiene sincronizada con plan_tematico + unidades_didacticas
    // para no romper la generación de documentos existente.
    unidades: { units: [] as unknown[] },
    recursos_bibliografia: {},
  };
}

export type SyllabusContent = ReturnType<typeof defaultContent> & Record<string, unknown>;

// Mezcla profunda de 1 nivel: defaults <- stored.
export function mergeWithDefaults(stored: Record<string, unknown> | null | undefined) {
  const base = defaultContent() as Record<string, unknown>;
  const src = (stored ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(base)) {
    const b = base[key] as Record<string, unknown>;
    const s = src[key];
    if (s && typeof s === "object" && !Array.isArray(s) && b && typeof b === "object" && !Array.isArray(b)) {
      out[key] = { ...(b as object), ...(s as object) };
    } else if (s !== undefined) {
      out[key] = s;
    }
  }
  // Retro-compatibilidad: espejos antiguos -> nuevos cuando los nuevos están vacíos.
  try {
    const fund = out.fundamentacion as Record<string, string>;
    if (src.fundamentacion && typeof src.fundamentacion === "object") {
      for (const [k, v] of Object.entries(src.fundamentacion as Record<string, unknown>)) {
        if (typeof v === "string" && !(fund[k] ?? "").toString().trim()) fund[k] = v;
      }
    }
    const ev = out.evaluacion as Record<string, unknown>;
    const oldEv = src.evaluacion as Record<string, unknown> | undefined;
    if (oldEv) {
      if (!ev.diagnostica && oldEv.diagnostic) ev.diagnostica = oldEv.diagnostic;
      if (!ev.formativa_desc && oldEv.formative) ev.formativa_desc = oldEv.formative;
      if (!ev.final_desc && oldEv.final) ev.final_desc = oldEv.final;
    }
    const rec = out.recursos as Record<string, string>;
    const oldRec = src.recursos_bibliografia as Record<string, string> | undefined;
    if (oldRec) {
      if (!rec.basicos && oldRec.basic_resources) rec.basicos = oldRec.basic_resources;
      if (!rec.audiovisuales && oldRec.audiovisual_resources) rec.audiovisuales = oldRec.audiovisual_resources;
      if (!rec.tecnicos && oldRec.technical_resources) rec.tecnicos = oldRec.technical_resources;
    }
    const bib = out.bibliografia as Record<string, string>;
    if (oldRec) {
      if (!bib.basica && oldRec.basic_bibliography) bib.basica = oldRec.basic_bibliography;
      if (!bib.consulta && oldRec.reference_bibliography) bib.consulta = oldRec.reference_bibliography;
    }
    // "unidades" histórico (4 units con knowledge/skills/values/hours) -> nuevos pasos.
    const oldUnits = (src.unidades as { units?: Array<Record<string, unknown>> } | undefined)?.units;
    const cg = out.contenidos_generales as { conocimientos: string[]; habilidades: string[]; valores: string[] };
    const ud = out.unidades_didacticas as { unidades: Array<Record<string, string>> };
    const pt = out.plan_tematico as { unidades: Array<Record<string, unknown>> };
    if (Array.isArray(oldUnits) && oldUnits.length) {
      oldUnits.slice(0, 4).forEach((u, i) => {
        if (!cg.conocimientos[i] && typeof u.knowledge === "string") cg.conocimientos[i] = u.knowledge;
        if (!cg.habilidades[i] && typeof u.skills === "string") cg.habilidades[i] = u.skills;
        if (!cg.valores[i] && typeof u.values === "string") cg.valores[i] = u.values;
        if (!ud.unidades[i].conocimientos && typeof u.knowledge === "string") ud.unidades[i].conocimientos = u.knowledge;
        if (!ud.unidades[i].habilidades && typeof u.skills === "string") ud.unidades[i].habilidades = u.skills;
        if (!ud.unidades[i].valores && typeof u.values === "string") ud.unidades[i].valores = u.values;
        if (typeof u.title === "string" && ud.unidades[i].titulo.startsWith("Unidad")) ud.unidades[i].titulo = u.title;
        const h = u.hours as Record<string, number> | undefined;
        if (h && !(pt.unidades[i].C as number)) {
          (pt.unidades[i] as Record<string, unknown>).C = h.C ?? 0;
          (pt.unidades[i] as Record<string, unknown>).CP = h.CP ?? 0;
          (pt.unidades[i] as Record<string, unknown>).S = h.S ?? 0;
          (pt.unidades[i] as Record<string, unknown>).T = h.T ?? 0;
          (pt.unidades[i] as Record<string, unknown>).L = h.L ?? 0;
          (pt.unidades[i] as Record<string, unknown>).E = h.E ?? 0;
          (pt.unidades[i] as Record<string, unknown>).THP_aut = h.THP_autonomous ?? 0;
          (pt.unidades[i] as Record<string, unknown>).TI = h.TI ?? 0;
          const doc = ["C", "CP", "S", "T", "L", "E"].reduce((s, k) => s + Number(h[k] ?? 0), 0);
          (pt.unidades[i] as Record<string, unknown>).THP_doc = doc;
          (pt.unidades[i] as Record<string, unknown>).TI = h.TI ?? 0;
        }
      });
    }
  } catch {
    // Nunca romper la carga por datos históricos.
  }
  return out;
}

// % de completitud por sección (para la barra de progreso).
export function sectionCompletion(content: Record<string, unknown>) {
  const result: Record<string, number> = {};
  for (const key of SECTION_KEYS) {
    const section = content[key] as unknown;
    if (!section || typeof section !== "object") {
      result[key] = 0;
      continue;
    }
    const values: unknown[] = [];
    const collect = (v: unknown) => {
      if (typeof v === "string") values.push(v);
      else if (typeof v === "number") values.push(String(v));
      else if (Array.isArray(v)) v.forEach(collect);
      else if (v && typeof v === "object") Object.values(v).forEach(collect);
    };
    collect(section);
    const filled = values.filter((v) => String(v ?? "").trim() !== "" && String(v) !== "0").length;
    result[key] = values.length ? Math.min(100, Math.round((filled / values.length) * 100)) : 0;
  }
  return result;
}
