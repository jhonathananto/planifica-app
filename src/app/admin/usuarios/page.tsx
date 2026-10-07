import { createClient } from "@/lib/supabase/server";
import { inviteUserAction, updateUserAction } from "./actions";

type Props = { searchParams: Promise<{ error?: string; invitado?: string; actualizado?: string }> };

export default async function UsersPage({ searchParams }: Props) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles")
    .select("user_id,email,full_name,role,is_active,created_at")
    .order("full_name", { ascending: true });

  const errors: Record<string, string> = {
    config: "Configura SUPABASE_SECRET_KEY y APP_URL en el entorno de Vercel o .env.local para enviar invitaciones.",
    datos: "Completa los campos y verifica el rol seleccionado.",
    invitacion: "No se pudo enviar la invitación. Revisa la configuración de correo de Supabase Auth.",
    perfil: "La invitación se creó, pero no se pudo actualizar el perfil. Revisa el registro de esta cuenta.",
    propia: "No puedes desactivar tu cuenta ni quitarte el rol administrador.",
    guardar: "No se pudo actualizar la cuenta.",
  };

  return (
    <main className="page-content">
      <div className="page-heading compact-heading"><div><p className="eyebrow">GESTIÓN · ACCESOS</p>
        <h1>Usuarios y roles</h1><p>Invita docentes y asigna permisos institucionales.</p></div></div>
      {query.error && <div className="form-error" role="alert">{errors[query.error] ?? "Ocurrió un error."}</div>}
      {(query.invitado || query.actualizado) && <div className="form-success">Cambios guardados.</div>}
      <div className="period-layout users-layout">
        <section className="surface-card users-table-card">
          <div className="section-top"><div><span className="tiny-label">CUENTAS REGISTRADAS</span><h2>Usuarios</h2></div><span className="count-badge">{profiles?.length ?? 0}</span></div>
          <div className="users-list">
            {profiles?.map((user) => <article className="user-row" key={user.user_id}>
              <div className="avatar">{(user.full_name || user.email || "?").slice(0, 1).toUpperCase()}</div>
              <div className="user-main"><strong>{user.full_name || "Nombre pendiente"}</strong><small>{user.email}</small></div>
              <form action={updateUserAction} className="user-controls">
                <input type="hidden" name="user_id" value={user.user_id} />
                <select name="role" defaultValue={user.role} aria-label={"Rol de " + user.email}><option value="docente">Docente</option><option value="admin">Administrador</option></select>
                <select name="is_active" defaultValue={String(user.is_active)} aria-label={"Acceso de " + user.email}><option value="true">Activo</option><option value="false">Inactivo</option></select>
                <button className="button button-small button-outline" type="submit">Guardar</button>
              </form>
            </article>)}
            {!profiles?.length && <div className="empty-state"><strong>No hay usuarios todavía</strong><p>Invita al primer docente o administrador.</p></div>}
          </div>
        </section>
        <aside className="surface-card create-period-card invite-card"><span className="tiny-label">NUEVO ACCESO</span><h2>Invita a una persona</h2>
          <p className="muted">Supabase enviará un enlace para establecer la contraseña. La cuenta inicia con rol docente.</p>
          <form action={inviteUserAction} className="stack-form">
            <label>Nombre completo<input name="full_name" required placeholder="Nombre y apellido" /></label>
            <label>Correo institucional<input name="email" type="email" required placeholder="nombre@institucion.edu" /></label>
            <button className="button button-primary button-full" type="submit">Enviar invitación <span>↗</span></button>
          </form>
          <p className="service-key-note">La invitación utiliza una clave administrativa que solo se ejecuta en el servidor.</p>
        </aside>
      </div>
    </main>
  );
}
