"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function addCareerToPeriodAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("academic_offerings").insert({
    period_id: String(formData.get("period_id") ?? ""),
    career_id: String(formData.get("career_id") ?? ""),
    is_enabled: true,
  });
  if (error) redirect("/admin/oferta?error=carrera");
  revalidatePath("/admin/oferta");
  redirect("/admin/oferta?guardado=1");
}

export async function addSemesterToPeriodAction(formData: FormData) {
  await requireAdmin();
  const academicOfferingId = String(formData.get("academic_offering_id") ?? "");
  const semesterId = String(formData.get("semester_id") ?? "");
  const supabase = await createClient();
  const [{ data: offering }, { data: semester }] = await Promise.all([
    supabase.from("academic_offerings").select("career_id").eq("id", academicOfferingId).maybeSingle(),
    supabase.from("semesters").select("id,career_id").eq("id", semesterId).maybeSingle(),
  ]);
  if (!offering || !semester || offering.career_id !== semester.career_id) redirect("/admin/oferta?error=semestre");
  const { error } = await supabase.from("semester_offerings").insert({
    academic_offering_id: academicOfferingId,
    career_id: offering.career_id,
    semester_id: semester.id,
    is_enabled: true,
  });
  if (error) redirect("/admin/oferta?error=semestre");
  revalidatePath("/admin/oferta");
  redirect("/admin/oferta?guardado=1");
}

export async function assignCourseAction(formData: FormData) {
  await requireAdmin();
  const semesterOfferingId = String(formData.get("semester_offering_id") ?? "");
  const curriculumSubjectId = String(formData.get("curriculum_subject_id") ?? "");
  const teacherId = String(formData.get("teacher_id") ?? "");
  const supabase = await createClient();
  const [{ data: semesterOffering }, { data: curriculumSubject }, { data: teacher }] = await Promise.all([
    supabase.from("semester_offerings").select("id,semester_id").eq("id", semesterOfferingId).maybeSingle(),
    supabase.from("curriculum_subjects").select("id,semester_id").eq("id", curriculumSubjectId).maybeSingle(),
    supabase.from("profiles").select("user_id,role,is_active").eq("user_id", teacherId).maybeSingle(),
  ]);
  if (!semesterOffering || !curriculumSubject || semesterOffering.semester_id !== curriculumSubject.semester_id ||
      !teacher || teacher.role !== "docente" || !teacher.is_active) {
    redirect("/admin/oferta?error=asignatura");
  }
  const weekday = String(formData.get("weekday") ?? "");
  const startTime = String(formData.get("start_time") ?? "");
  const duration = Number(formData.get("class_duration") ?? 0);
  const meetingSchedule = weekday && startTime && duration > 0
    ? [{ weekday, start_time: startTime, duration_minutes: duration }]
    : [];
  const { error } = await supabase.from("course_offerings").insert({
    semester_offering_id: semesterOfferingId,
    semester_id: semesterOffering.semester_id,
    curriculum_subject_id: curriculumSubjectId,
    teacher_id: teacherId,
    parallel: String(formData.get("parallel") ?? "A").trim() || "A",
    modality: String(formData.get("modality") ?? "Presencial"),
    meeting_schedule: meetingSchedule,
    is_enabled: true,
  });
  if (error) redirect("/admin/oferta?error=asignatura");
  revalidatePath("/admin/oferta");
  revalidatePath("/docente");
  redirect("/admin/oferta?guardado=1");
}

export async function addCalendarEventAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("academic_calendar_events").insert({
    period_id: String(formData.get("period_id") ?? ""),
    label: String(formData.get("label") ?? "").trim(),
    event_type: String(formData.get("event_type") ?? "institucional"),
    starts_on: String(formData.get("starts_on") ?? ""),
    ends_on: String(formData.get("ends_on") ?? ""),
    is_teaching_day: String(formData.get("is_teaching_day") ?? "") === "on",
    details: String(formData.get("details") ?? "").trim() || null,
  });
  if (error) redirect("/admin/oferta?error=calendario");
  revalidatePath("/admin/oferta");
  redirect("/admin/oferta?guardado=1");
}

