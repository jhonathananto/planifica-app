"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    void supabase.auth.getUser().then(({ data, error: authError }) => {
      if (!active) return;
      if (authError || !data.user) {
        setError("La invitación ya no está activa. Solicita al administrador que te envíe una nueva.");
      } else {
        setEmail(data.user.email ?? "");
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError("No se pudo guardar la contraseña. Vuelve a abrir el enlace de invitación o solicita uno nuevo.");
      setSaving(false);
      return;
    }

    router.replace("/inicio");
    router.refresh();
  }

  return (
    <main className="login-layout password-setup-layout">
      <section className="login-intro">
        <p className="eyebrow">ACCESO DOCENTE</p>
        <div className="login-mark" aria-hidden="true">PD</div>
        <h1>Tu espacio de planificación empieza aquí.</h1>
        <p className="login-copy">Establece una contraseña personal para ingresar a tus asignaturas y documentos académicos.</p>
      </section>

      <section className="login-card">
        <div className="login-card-top">
          <span className="tiny-label">ACTIVACIÓN DE CUENTA</span>
          <span className="secure-label"><i /> Conexión protegida</span>
        </div>
        <h2>Define tu contraseña</h2>
        <p>{loading ? "Validando invitación…" : email ? `Cuenta: ${email}` : "Confirma tu acceso con el enlace de invitación."}</p>
        {error && <div className="form-error" role="alert">{error}</div>}
        {!loading && email && (
          <form onSubmit={handleSubmit} className="login-form">
            <label htmlFor="password">Nueva contraseña</label>
            <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
            <label htmlFor="confirmation">Confirma la contraseña</label>
            <input id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={8} required />
            <button className="button button-primary button-full" type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
        )}
        <p className="login-footnote"><Link href="/login">Volver al inicio de sesión</Link></p>
      </section>
      <footer className="login-footer">Planificación Docente <span>·</span> Acceso institucional</footer>
    </main>
  );
}
