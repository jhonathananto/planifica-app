import { requireTeacher } from "@/lib/auth";
import { signOutAction } from "@/app/auth/actions";
import TeacherSidebar from "@/components/teacher-sidebar";

export default async function TeacherLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireTeacher();
  return (
    <div className="app-shell teacher-shell">
      <TeacherSidebar />
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
