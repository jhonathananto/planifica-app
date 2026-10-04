import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminHomePage() {
  const supabase = await createClient();
  const [periods, careers, subjects, teachers] = await Promise.all([
    supabase.from("academic_periods").select("id", { count: "exact", head: true }),
    supabase.from("careers").select("id", { count: "exact", head: true }),
    supabase.from("subjects").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("user_id", { count: "exact", head: true }).eq("role", "docente"),
  ]);
  const activePeriod = await supabase
    .from("academic_periods")
    .select("id,code,name,starts_on,ends_on,status")
    .eq("status", "abierto")
    .order("starts_on", { ascending: false })
    .limit(1)
    .maybeSingle();

  const stats = [
    { value: periods.count ?? 0, label: "Períodos académicos", note: "Configurados", tone: "mint" },
    { value: careers.count ?? 0, label: "Carreras", note: "En el catálogo", tone: "blue" },
    { value: subjects.count ?? 0, label: "Asignaturas", note: "En el currículo", tone: "amber" },
    { value: teachers.count ?? 0, label: "Docentes", note: "Cuentas activas", tone: "lilac" },
  ];

  return (
    <main className="page-content">
      <div className="page-heading">
        <div><p className="eyebrow">PANEL DE ADMINISTRACIÓN</p><h1>Buenos días. Este es tu centro de control.</h1>
          <p>Configura el período y la oferta antes de habilitar la planificación docente.</p></div>
        <Link className="button button-primary" href="/admin/periodos">Gestionar períodos <span>↗</span></Link>
      </div>
      <section className="stats-grid" aria-label="Resumen institucional">
        {stats.map((stat) => <article className="stat-card" key={stat.label}>
          <div className={"stat-icon " + stat.tone}>{stat.label === "Carreras" ? "⌘" : stat.label === "Asignaturas" ? "▦" : stat.label === "Docentes" ? "♙" : "◷"}</div>
          <div className="stat-value">{stat.value}</div><div className="stat-label">{stat.label}</div><div className="stat-note">{stat.note}</div>
        </article>)}
      </section>
      <section className="admin-grid">
        <article className="surface-card period-highlight">
          <div className="section-top"><div><span className="tiny-label">PERÍODO EN CURSO</span><h2>{activePeriod.data?.name ?? "Aún no hay período abierto"}</h2></div>
            <span className={"status-pill " + (activePeriod.data ? "status-open" : "status-draft")}>{activePeriod.data ? "Abierto" : "Pendiente"}</span>
          </div>
          {activePeriod.data ? <p className="muted">{activePeriod.data.code} · {activePeriod.data.starts_on} — {activePeriod.data.ends_on}</p> :
            <p className="muted">Crea el período y habilita las carreras, semestres y asignaturas que participarán.</p>}
          <Link className="inline-link" href="/admin/periodos">Ver períodos <span>→</span></Link>
        </article>
        <article className="surface-card setup-card">
          <span className="tiny-label">ORDEN RECOMENDADO</span>
          <h2>Prepara la oferta paso a paso</h2>
          <ol className="setup-list">
            <li className="complete"><span>01</span><div><strong>Crear el período</strong><small>Fechas, duración y calendario académico</small></div><b>En marcha</b></li>
            <li><span>02</span><div><strong>Habilitar carreras y semestres</strong><small>Define qué niveles participan</small></div></li>
            <li><span>03</span><div><strong>Asignar materias y docentes</strong><small>Cada docente verá solo sus asignaturas</small></div></li>
          </ol>
        </article>
      </section>
      <p className="security-note"><span>◆</span> La información de cada docente se protege también en la base de datos mediante políticas por fila.</p>
    </main>
  );
}

