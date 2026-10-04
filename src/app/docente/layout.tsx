import Link from "next/link";
import { requireTeacher } from "@/lib/auth";
import { signOutAction } from "@/app/auth/actions";

export default async function TeacherLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireTeacher();
  return (
    <div className="app-shell teacher-shell">
      <aside className="sidebar teacher-sidebar">
        <Link className="brand" href="/docente">
          <span className="brand-icon teacher-brand">P</span>
          <span><strong>Planificación</strong><small>DOCENTE</small></span>
        </Link>
        <div className="side-group">
          <span className="side-heading">MI ESPACIO</span>
          <Link className="side-link active" href="/docente"><span>⌂</span> Mis asignaturas</Link>
          <span className="side-heading side-heading-gap">DOCUMENTOS</span>
          <span className="side-link side-link-muted"><span>▤</span> Sílabos</span>
          <span className="side-link side-link-muted"><span>▧</span> Planes de clase</span>
        </div>
        <div className="sidebar-bottom">
          <span className="teacher-chip">ESPACIO DOCENTE</span>
          <span className="side-caption">Tu carga académica y tus documentos en un solo lugar.</span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">Mi espacio <span>/</span> Docente</div>
          <div className="topbar-user"><span className="avatar">{(profile.full_name || "D").slice(0, 1).toUpperCase()}</span><span>{profile.full_name || "Docente"}</span>
            <form action={signOutAction}><button className="text-button" type="submit">Salir</button></form>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

