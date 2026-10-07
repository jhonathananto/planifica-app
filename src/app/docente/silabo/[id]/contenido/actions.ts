"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SECTION_KEYS } from "@/lib/syllabus/sections";

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

// Autoguardado por sección (usado por el multi-step form como respaldo sin JS
// y por integraciones futuras). Valida la ponderación de evaluación <= 10.
export async function autosaveSyllabusSectionAction(syllabusId: string, section: string, sectionData: Record<string, unknown>) {
  await requireTeacher();
  if (!SECTION_KEYS.includes(section as (typeof SECTION_KEYS)[number])) {
    return { ok: false, error: "Sección no válida." };
  }
  if (section === "evaluacion") {
    const dist = (sectionData.point_distribution as Array<{ first_partial: number; second_partial: number }> | undefined) ?? [];
    const first = dist.reduce((s, r) => s + Number(r.first_partial ?? 0), 0);
    const second = dist.reduce((s, r) => s + Number(r.second_partial ?? 0), 0);
    if (first > 10 || second > 10) {
      return { ok: false, error: "La ponderación no puede superar 10 puntos por parcial." };
    }
  }
  const supabase = await createClient();
  const { data: existing } = await supabase.from("syllabi").select("content").eq("id", syllabusId).maybeSingle();
  if (!existing) return { ok: false, error: "Sílabo no encontrado." };
  const content = { ...((existing.content as Record<string, unknown>) ?? {}), [section]: sectionData };
  const { error } = await supabase.from("syllabi").update({ content }).eq("id", syllabusId);
  if (error) return { ok: false, error: "No se pudo guardar. Comprueba que el período siga abierto." };
  revalidatePath("/docente/silabo/" + syllabusId + "/contenido");
  return { ok: true };
}

// Acción histórica (formularios por sección con botón guardar). Se conserva por
// compatibilidad y ahora delega en el autoguardado por sección.
export async function saveSyllabusContentAction(formData: FormData) {
  await requireTeacher();
  const syllabusId = text(formData, "syllabus_id");
  const section = text(formData, "section");
  const supabase = await createClient();
  const { data: existing } = await supabase.from("syllabi").select("content").eq("id", syllabusId).maybeSingle();
  if (!existing) redirect("/docente");
  const current = (existing.content as Record<string, unknown> ?? {}) as Record<string, Record<string, unknown>>;
  const prev = (current[section] ?? {}) as Record<string, unknown>;

  let sectionData: Record<string, unknown> = { ...prev };
  if (section === "fundamentacion") {
    for (const key of ["introduccion_1", "introduccion_2", "introduccion_3", "perfil_profesional",
      "profile_contribution", "other_subjects_contribution", "general_capabilities",
      "cultural_formation", "problem", "study_object", "general_objective", "specific_objectives"]) {
      const v = text(formData, key);
      if (formData.has(key) || v) sectionData[key] = v;
    }
  } else if (section === "evaluacion") {
    const keys = ["classroom", "reinforcement", "practical", "evaluation"] as const;
    const labels: Record<string, string> = {
      classroom: "Actividades en el aula de clase",
      reinforcement: "Actividades de refuerzo académico",
      practical: "Actividades prácticas y experimentales",
      evaluation: "Evaluación",
    };
    const num = (name: string) => {
      const raw = text(formData, name);
      if (!raw) return 0;
      const n = Number(raw.replace(",", "."));
      return Number.isFinite(n) && n >= 0 ? n : -1;
    };
    const points = keys.map((k) => ({
      label: labels[k],
      first_partial: num("score_" + k + "_first"),
      second_partial: num("score_" + k + "_second"),
    }));
    if (points.some((r) => r.first_partial < 0 || r.second_partial < 0)) {
      redirect("/docente/silabo/" + syllabusId + "/contenido?error=ponderacion");
    }
    const firstTotal = points.reduce((s, r) => s + r.first_partial, 0);
    const secondTotal = points.reduce((s, r) => s + r.second_partial, 0);
    if (firstTotal > 10 || secondTotal > 10) redirect("/docente/silabo/" + syllabusId + "/contenido?error=ponderacion");
    sectionData = {
      ...prev,
      diagnostic: text(formData, "diagnostic"), formative: text(formData, "formative"),
      final: text(formData, "final"), formative_criteria: text(formData, "formative_criteria"),
      classroom_activities: formData.getAll("classroom_activities").map(String),
      independent_activities: formData.getAll("independent_activities").map(String),
      practical_activities: formData.getAll("practical_activities").map(String),
      summative_activities: formData.getAll("summative_activities").map(String),
      point_distribution: points, first_partial_total: firstTotal, second_partial_total: secondTotal,
    };
  } else {
    // Secciones nuevas del multi-step: se guardan campo a campo desde el cliente;
    // este fallback conserva lo recibido sin borrar lo existente.
    redirect("/docente/silabo/" + syllabusId + "/contenido");
  }

  const result = await autosaveSyllabusSectionAction(syllabusId, section, sectionData);
  if (!result.ok) redirect("/docente/silabo/" + syllabusId + "/contenido?error=guardar");
  revalidatePath("/docente/silabo/" + syllabusId);
  revalidatePath("/docente/silabo/" + syllabusId + "/contenido");
  redirect("/docente/silabo/" + syllabusId + "/contenido?guardado=" + section);
}
