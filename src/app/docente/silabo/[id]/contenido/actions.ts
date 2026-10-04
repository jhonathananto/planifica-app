"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
const number = (form: FormData, name: string) => {
  const raw = text(form, name);
  if (!raw) return 0;
  const result = Number(raw.replace(",", "."));
  return Number.isFinite(result) && result >= 0 ? result : -1;
};

const unitTitles = ["Unidad I", "Unidad II", "Unidad III", "Unidad IV"];
const scoreRows = [
  { key: "classroom", label: "Actividades en el aula de clase" },
  { key: "reinforcement", label: "Actividades de refuerzo académico" },
  { key: "practical", label: "Actividades prácticas y experimentales" },
  { key: "evaluation", label: "Evaluación" },
];

export async function saveSyllabusContentAction(formData: FormData) {
  await requireTeacher();
  const syllabusId = text(formData, "syllabus_id");
  const section = text(formData, "section");
  const supabase = await createClient();
  const { data: existing } = await supabase.from("syllabi")
    .select("content").eq("id", syllabusId).maybeSingle();
  if (!existing) redirect("/docente");

  let sectionData: Record<string, unknown>;
  if (section === "fundamentacion") {
    sectionData = Object.fromEntries([
      "profile_contribution", "other_subjects_contribution", "general_capabilities",
      "cultural_formation", "problem", "study_object", "general_objective", "specific_objectives",
    ].map((key) => [key, text(formData, key)]));
  } else if (section === "evaluacion") {
    const points = scoreRows.map((row) => ({
      label: row.label,
      first_partial: number(formData, "score_" + row.key + "_first"),
      second_partial: number(formData, "score_" + row.key + "_second"),
    }));
    if (points.some((row) => row.first_partial < 0 || row.second_partial < 0)) {
      redirect("/docente/silabo/" + syllabusId + "/contenido?error=ponderacion");
    }
    const firstTotal = points.reduce((sum, row) => sum + row.first_partial, 0);
    const secondTotal = points.reduce((sum, row) => sum + row.second_partial, 0);
    if (firstTotal > 10 || secondTotal > 10) redirect("/docente/silabo/" + syllabusId + "/contenido?error=ponderacion");
    sectionData = {
      diagnostic: text(formData, "diagnostic"),
      formative: text(formData, "formative"),
      final: text(formData, "final"),
      formative_criteria: text(formData, "formative_criteria"),
      classroom_activities: formData.getAll("classroom_activities").map(String),
      independent_activities: formData.getAll("independent_activities").map(String),
      practical_activities: formData.getAll("practical_activities").map(String),
      summative_activities: formData.getAll("summative_activities").map(String),
      point_distribution: points,
      first_partial_total: firstTotal,
      second_partial_total: secondTotal,
    };
  } else if (section === "unidades") {
    const units = unitTitles.map((title, index) => {
      const prefix = "unit_" + (index + 1) + "_";
      const weekly = ["C", "CP", "S", "T", "L", "E", "THP_autonomous", "TI"].map((key) => ({
        key,
        value: number(formData, prefix + "hours_" + key),
      }));
      const teacherHours = weekly.slice(0, 6).reduce((sum, row) => sum + row.value, 0);
      const autonomous = weekly.find((row) => row.key === "THP_autonomous")?.value ?? 0;
      const independent = weekly.find((row) => row.key === "TI")?.value ?? 0;
      const totalHours = teacherHours + autonomous + independent;
      return {
        title: text(formData, prefix + "title") || title,
        knowledge: text(formData, prefix + "knowledge"),
        skills: text(formData, prefix + "skills"),
        values: text(formData, prefix + "values"),
        hours: Object.fromEntries(weekly.map((row) => [row.key, row.value])),
        hours_with_teacher: teacherHours,
        total_hours: totalHours,
      };
    });
    if (units.some((unit) => Object.values(unit.hours).some((v) => typeof v === "number" && v < 0))) {
      redirect("/docente/silabo/" + syllabusId + "/contenido?error=horas");
    }
    sectionData = {
      units,
      calculated_totals: {
        hours_with_teacher: units.reduce((sum, unit) => sum + unit.hours_with_teacher, 0),
        THP_autonomous: units.reduce((sum, unit) => sum + Number(unit.hours.THP_autonomous ?? 0), 0),
        TI: units.reduce((sum, unit) => sum + Number(unit.hours.TI ?? 0), 0),
        total: units.reduce((sum, unit) => sum + unit.total_hours, 0),
      },
    };
  } else if (section === "metodologia") {
    sectionData = Object.fromEntries([
      "educational_model", "theory_practice", "student_motivation", "critical_thinking",
      "inclusive_learning", "learning_capacities", "autonomous_work",
    ].map((key) => [key, text(formData, key)]));
  } else if (section === "recursos_bibliografia") {
    sectionData = {
      basic_resources: text(formData, "basic_resources"),
      audiovisual_resources: text(formData, "audiovisual_resources"),
      technical_resources: text(formData, "technical_resources"),
      basic_bibliography: text(formData, "basic_bibliography"),
      reference_bibliography: text(formData, "reference_bibliography"),
    };
  } else {
    redirect("/docente/silabo/" + syllabusId + "/contenido?error=seccion");
  }

  const content = { ...(existing.content as Record<string, unknown> ?? {}), [section]: sectionData };
  const { error } = await supabase.from("syllabi").update({ content }).eq("id", syllabusId);
  if (error) redirect("/docente/silabo/" + syllabusId + "/contenido?error=guardar");

  revalidatePath("/docente/silabo/" + syllabusId);
  revalidatePath("/docente/silabo/" + syllabusId + "/contenido");
  redirect("/docente/silabo/" + syllabusId + "/contenido?guardado=" + section);
}
