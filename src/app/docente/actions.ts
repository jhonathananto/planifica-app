"use server";

import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createSyllabusAction(formData: FormData) {
  const profile = await requireTeacher();
  const courseOfferingId = String(formData.get("course_offering_id") ?? "");
  const supabase = await createClient();

  const { data: existing } = await supabase.from("syllabi")
    .select("id").eq("course_offering_id", courseOfferingId).maybeSingle();
  if (existing) redirect("/docente/silabo/" + existing.id);

  const { data, error } = await supabase.from("syllabi")
    .insert({ course_offering_id: courseOfferingId, status: "borrador" })
    .select("id").single();

  if (error || !data) redirect("/docente?error=silabo");
  void profile;
  redirect("/docente/silabo/" + data.id);
}

