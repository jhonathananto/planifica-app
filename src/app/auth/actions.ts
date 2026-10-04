"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=credenciales");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=credenciales");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.is_active) {
    await supabase.auth.signOut();
    redirect("/login?error=cuenta");
  }

  redirect(profile.role === "admin" ? "/admin" : "/docente");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

