import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UserProfile = {
  user_id: string;
  email: string;
  full_name: string;
  role: "admin" | "docente";
  is_active: boolean;
};

export async function requireProfile(): Promise<UserProfile> {
  const supabase = await createClient();
  const { data: { claims } } = await supabase.auth.getClaims();
  if (!claims?.sub) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_id,email,full_name,role,is_active")
    .eq("user_id", claims.sub)
    .maybeSingle();

  if (error || !profile || !profile.is_active) redirect("/login?error=cuenta");
  return profile as UserProfile;
}

export async function requireAdmin(): Promise<UserProfile> {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/docente");
  return profile;
}

export async function requireTeacher(): Promise<UserProfile> {
  const profile = await requireProfile();
  if (profile.role !== "docente") redirect("/admin");
  return profile;
}

