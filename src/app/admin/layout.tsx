import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { signOutAction } from "@/app/auth/actions";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireAdmin();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/admin">
          <span className="brand-icon">P</span>
          <span><strong>Planificación</strong><small>DOCENTE</small></span>
        </Link>
        <div className="side-group">
          <span className="side-heading">GESTIÓN</span>
          <Link className="side-link active" href="/admin"><span>⌂</span> Resumen</Link>
          <Link className="side-link" href="/admin/periodos"><span>◷</span> Períodos académicos</Link>
          <Link className="side-link" href="/admin/estructura"><span>⌘</span> Carreras y semestres</Link>
          <Link className="side-link" href="/admin/oferta"><span>▦</span> Oferta académica</Link>
          <Link className="side-link" href="/admin/usuarios"><span>♙</span> Usuarios docentes</Link>
        </div>
        <div className="sidebar-bottom">
          <span className="admin-chip">ADMINISTRACIÓN</span>
          <span className="side-caption">Control total de la oferta y los datos institucionales.</span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">Espacio institucional <span>/</span> Administrador</div>
          <div className="topbar-user"><span className="avatar avatar-admin">AD</span><span>{profile.full_name || "Administrador"}</span>
            <form action={signOutAction}><button className="text-button" type="submit">Salir</button></form>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
