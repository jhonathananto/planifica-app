"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createCareerAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("careers").insert({
    code: String(formData.get("code") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    degree_level: String(formData.get("degree_level") ?? "").trim() || null,
  });
  if (error) redirect("/admin/estructura?error=carrera");
  revalidatePath("/admin/estructura");
  redirect("/admin/estructura?guardado=1");
}

export async function createSemesterAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("semesters").insert({
    career_id: String(formData.get("career_id") ?? ""),
    level_number: Number(formData.get("level_number") ?? 0),
    name: String(formData.get("name") ?? "").trim(),
  });
  if (error) redirect("/admin/estructura?error=semestre");
  revalidatePath("/admin/estructura");
  redirect("/admin/estructura?guardado=1");
}

export async function createSubjectAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("subjects").insert({
    code: String(formData.get("code") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
  });
  if (error) redirect("/admin/estructura?error=asignatura");
  revalidatePath("/admin/estructura");
  redirect("/admin/estructura?guardado=1");
}

export async function addSubjectToSemesterAction(formData: FormData) {
  await requireAdmin();
  const prerequisites = formData.getAll("prerequisites").map(String);
  const corequisites = formData.getAll("corequisites").map(String);
  const hours = Number(formData.get("total_hours") ?? 0);
  const supabase = await createClient();
  const { error } = await supabase.from("curriculum_subjects").insert({
    semester_id: String(formData.get("semester_id") ?? ""),
    subject_id: String(formData.get("subject_id") ?? ""),
    prerequisites,
    corequisites,
    default_hours: hours > 0 ? { total: hours } : {},
  });
  if (error) redirect("/admin/estructura?error=curriculo");
  revalidatePath("/admin/estructura");
  redirect("/admin/estructura?guardado=1");
}

