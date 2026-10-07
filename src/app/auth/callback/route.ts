import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=invitacion", requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=invitacion", requestUrl.origin));
  }

  const requestedNext = requestUrl.searchParams.get("next");
  const destination = requestedNext === "/auth/establecer-contrasena"
    ? requestedNext
    : "/inicio";

  return NextResponse.redirect(new URL(destination, requestUrl.origin));
}
