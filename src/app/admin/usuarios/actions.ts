"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function inviteUserAction(formData: FormData) {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!email || !fullName) redirect("/admin/usuarios?error=datos");

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    redirect("/admin/usuarios?error=config");
  }
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
  });
  if (error || !data.user) redirect("/admin/usuarios?error=invitacion");

  const { error: profileError } = await supabase.from("profiles").update({
    email,
    full_name: fullName,
    role: "docente",
    is_active: true,
  }).eq("user_id", data.user.id);
  if (profileError) redirect("/admin/usuarios?error=perfil");

  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios?invitado=1");
}

export async function updateUserAction(formData: FormData) {
  const current = await requireAdmin();
  const targetId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "");
  const isActive = String(formData.get("is_active") ?? "") === "true";
  if (!targetId || !["admin", "docente"].includes(role)) redirect("/admin/usuarios?error=datos");
  if (targetId === current.user_id && (!isActive || role !== "admin")) {
    redirect("/admin/usuarios?error=propia");
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("profiles")
    .update({ role, is_active: isActive })
    .eq("user_id", targetId);
  if (error) redirect("/admin/usuarios?error=guardar");

  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios?actualizado=1");
}
