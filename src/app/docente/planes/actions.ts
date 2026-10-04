"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function createClassPlanAction(formData: FormData) {
  await requireTeacher();
  const syllabusId = value(formData, "syllabus_id");
  const classDate = value(formData, "class_date");
  const duration = Number(formData.get("duration_minutes") ?? 0);
  const sessionIds = formData.getAll("session_ids").map(String).filter(Boolean);
  if (!syllabusId || !/^\d{4}-\d{2}-\d{2}$/.test(classDate) || !Number.isInteger(duration) || duration <= 0 || !sessionIds.length) {
    redirect("/docente/silabo/" + syllabusId + "/planificar?fecha=" + encodeURIComponent(classDate) + "&error=datos");
  }

  const supabase = await createClient();
  const { data: selectedActivities } = await supabase.from("syllabus_sessions")
    .select("id,activity_number,topic,teaching_form,teaching_aids,location")
    .eq("syllabus_id", syllabusId)
    .in("id", sessionIds);
  const activityById = new Map((selectedActivities ?? []).map((activity) => [activity.id, activity]));
  const chosen = sessionIds.map((id) => activityById.get(id)).filter((activity) => activity !== undefined);
  const activityNumbers = [...new Set(chosen.map((activity) => activity.activity_number).filter((number) => number != null))];
  const topics = chosen.map((activity) => activity.topic).filter(Boolean);
  const teachingForms = [...new Set(chosen.map((activity) => activity.teaching_form).filter(Boolean))];
  const teachingAids = [...new Set(chosen.map((activity) => activity.teaching_aids).filter(Boolean))];
  const locations = [...new Set(chosen.map((activity) => activity.location).filter(Boolean))];

  const content = {
    activity_number: value(formData, "activity_number") || activityNumbers.join(", "),
    method: value(formData, "method_other") || value(formData, "method"),
    teaching_form: value(formData, "teaching_form_other") || value(formData, "teaching_form") || teachingForms.join(", "),
    location: value(formData, "location") || locations.join(", "),
    resources: value(formData, "resources") || teachingAids.join("; "),
    introduction: {
      greeting_and_organization: value(formData, "greeting_and_organization"),
      attendance: value(formData, "attendance"),
      work_with_date: value(formData, "work_with_date"),
      closing_technique_review: value(formData, "closing_technique_review"),
      independent_work_check: value(formData, "independent_work_check"),
      motivation: value(formData, "motivation"),
      topic_announcement: value(formData, "topic_announcement") || topics.join("; "),
      objective: value(formData, "objective"),
    },
    development: value(formData, "development"),
    conclusions: {
      class_conclusions: value(formData, "class_conclusions"),
      learning_assessment: value(formData, "learning_assessment"),
      independent_work: value(formData, "independent_work"),
      next_class_topic: value(formData, "next_class_topic"),
      closing_technique: value(formData, "closing_technique"),
    },
    bibliography_basic: value(formData, "bibliography_basic"),
    bibliography_reference: value(formData, "bibliography_reference"),
  };

  const { data, error } = await supabase.rpc("create_class_plan", {
    target_syllabus_id: syllabusId,
    target_class_date: classDate,
    target_duration_minutes: duration,
    plan_content: content,
    selected_session_ids: sessionIds,
  });

  if (error || !data) {
    redirect("/docente/silabo/" + syllabusId + "/planificar?fecha=" + encodeURIComponent(classDate) + "&error=guardar");
  }
  revalidatePath("/docente");
  revalidatePath("/docente/silabo/" + syllabusId);
  redirect("/docente/plan/" + String(data));
}
