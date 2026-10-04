import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function InicioPage() {
  const supabase = await createClient();
  const { data: { claims } } = await supabase.auth.getClaims();
  if (!claims?.sub) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,is_active")
    .eq("user_id", claims.sub)
    .maybeSingle();

  if (!profile?.is_active) redirect("/login?error=cuenta");
  redirect(profile.role === "admin" ? "/admin" : "/docente");
}

