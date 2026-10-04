"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createPeriodAction(formData: FormData) {
  const profile = await requireAdmin();
  const supabase = await createClient();
  const period = {
    code: String(formData.get("code") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    starts_on: String(formData.get("starts_on") ?? ""),
    ends_on: String(formData.get("ends_on") ?? ""),
    teaching_weeks: Number(formData.get("teaching_weeks") ?? 16),
    status: String(formData.get("status") ?? "borrador"),
    created_by: profile.user_id,
  };
  const { error } = await supabase.from("academic_periods").insert(period);
  if (error) redirect("/admin/periodos?error=crear");
  revalidatePath("/admin");
  revalidatePath("/admin/periodos");
  redirect("/admin/periodos?creado=1");
}

export async function updatePeriodStatusAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["borrador", "abierto", "cerrado"].includes(status)) redirect("/admin/periodos?error=estado");
  const supabase = await createClient();
  const { error } = await supabase.from("academic_periods").update({ status }).eq("id", id);
  if (error) redirect("/admin/periodos?error=estado");
  revalidatePath("/admin");
  revalidatePath("/admin/periodos");
  redirect("/admin/periodos?actualizado=1");
}

export async function deletePeriodAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/periodos?error=eliminar");
  const supabase = await createClient();
  const { error } = await supabase.from("academic_periods").delete().eq("id", id);
  if (error) redirect("/admin/periodos?error=eliminar");
  revalidatePath("/admin");
  revalidatePath("/admin/periodos");
  redirect("/admin/periodos?eliminado=1");
}

