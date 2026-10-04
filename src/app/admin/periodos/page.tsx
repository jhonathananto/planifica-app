import { createClient } from "@/lib/supabase/server";
import { createPeriodAction, deletePeriodAction, updatePeriodStatusAction } from "./actions";

type PeriodsPageProps = {
  searchParams: Promise<{ creado?: string; actualizado?: string; eliminado?: string; error?: string }>;
};

const statusLabels: Record<string, string> = { borrador: "Borrador", abierto: "Abierto", cerrado: "Cerrado" };

export default async function PeriodsPage({ searchParams }: PeriodsPageProps) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: periods } = await supabase.from("academic_periods")
    .select("id,code,name,starts_on,ends_on,teaching_weeks,status,created_at")
    .order("starts_on", { ascending: false });

  return (
    <main className="page-content">
      <div className="page-heading compact-heading">
        <div><p className="eyebrow">CONFIGURACIÓN · PERÍODOS</p><h1>Períodos académicos</h1>
          <p>Crea el calendario de 16 semanas y controla cuándo pueden planificar los docentes.</p></div>
      </div>
      {query.error && <div className="form-error" role="alert">No se pudo completar el cambio. Verifica los datos o que el período no tenga una oferta asociada.</div>}
      {(query.creado || query.actualizado || query.eliminado) && <div className="form-success">Cambios guardados.</div>}

      <div className="period-layout">
        <section className="surface-card">
          <div className="section-top"><div><span className="tiny-label">CALENDARIO INSTITUCIONAL</span><h2>Períodos configurados</h2></div><span className="count-badge">{periods?.length ?? 0}</span></div>
          <div className="period-list">
            {periods?.length ? periods.map((period) => (
              <article className="period-row" key={period.id}>
                <div className="period-symbol">◷</div>
                <div className="period-main"><div className="period-title"><strong>{period.name}</strong><span className={"status-pill status-" + period.status}>{statusLabels[period.status] ?? period.status}</span></div>
                  <p>{period.code} <span>·</span> {period.starts_on} — {period.ends_on} <span>·</span> {period.teaching_weeks} semanas</p>
                </div>
                <div className="period-actions">
                  <form action={updatePeriodStatusAction} className="status-form">
                    <input type="hidden" name="id" value={period.id} />
                    <select name="status" defaultValue={period.status} aria-label={"Estado de " + period.name}>
                      <option value="borrador">Borrador</option><option value="abierto">Abierto</option><option value="cerrado">Cerrado</option>
                    </select>
                    <button className="button button-small button-outline" type="submit">Guardar</button>
                  </form>
                  <form action={deletePeriodAction}>
                    <input type="hidden" name="id" value={period.id} />
                    <button className="icon-button danger" type="submit" title="Eliminar período" aria-label={"Eliminar " + period.name}>×</button>
                  </form>
                </div>
              </article>
            )) : <div className="empty-state"><span>◷</span><strong>Tu calendario empieza aquí</strong><p>Agrega el primer período para continuar con la oferta académica.</p></div>}
          </div>
        </section>

        <aside className="surface-card create-period-card">
          <span className="tiny-label">NUEVO PERÍODO</span><h2>Define el ciclo lectivo</h2>
          <p className="muted">La duración inicial se establece en 16 semanas y puedes ajustarla para una oferta distinta.</p>
          <form action={createPeriodAction} className="stack-form">
            <label>Código<input name="code" required placeholder="IIPA2026" /></label>
            <label>Nombre<input name="name" required placeholder="Septiembre 2026 – Febrero 2027" /></label>
            <div className="form-pair"><label>Inicio<input name="starts_on" type="date" required /></label><label>Fin<input name="ends_on" type="date" required /></label></div>
            <div className="form-pair"><label>Semanas de clase<input name="teaching_weeks" type="number" min="1" max="52" defaultValue="16" required /></label>
              <label>Estado inicial<select name="status" defaultValue="borrador"><option value="borrador">Borrador</option><option value="abierto">Abierto</option></select></label></div>
            <button className="button button-primary button-full" type="submit">Crear período <span>↗</span></button>
          </form>
        </aside>
      </div>
      <div className="calendar-help"><span>i</span><p><strong>Próximo paso:</strong> agrega al período sus feriados y actividades institucionales para que las fechas sugeridas del Anexo 1 respeten el calendario.</p></div>
    </main>
  );
}

