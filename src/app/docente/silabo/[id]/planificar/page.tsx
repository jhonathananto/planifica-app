import Link from "next/link";
import { redirect } from "next/navigation";
import { createClassPlanAction } from "@/app/docente/planes/actions";
import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ fecha?: string; error?: string }> };
type Session = {
  id: string;
  row_order: number;
  week_number: number | null;
  planned_date: string | null;
  activity_number: number | null;
  unit_title: string | null;
  topic: string;
  teaching_form: string | null;
  duration_minutes: number | null;
  location: string | null;
  independent_work: string | null;
};

export default async function NewClassPlanPage({ params, searchParams }: Props) {
  await requireTeacher();
  const { id: syllabusId } = await params;
  const query = await searchParams;
  const date = query.fecha && /^\d{4}-\d{2}-\d{2}$/.test(query.fecha) ? query.fecha : "";
  const supabase = await createClient();
  const { data: syllabus } = await supabase.from("syllabi").select("id,course_offering_id").eq("id", syllabusId).maybeSingle();
  if (!syllabus) redirect("/docente");

  const sessionQuery = supabase.from("syllabus_sessions")
    .select("id,row_order,week_number,planned_date,activity_number,unit_title,topic,teaching_form,duration_minutes,location,independent_work")
    .eq("syllabus_id", syllabusId).neq("topic", "").order("row_order", { ascending: true });
  const { data: sessions } = date ? await sessionQuery.eq("planned_date", date) : await sessionQuery;
  const sessionRows = (sessions ?? []) as Session[];
  const { data: offering } = await supabase.from("course_offerings")
    .select("parallel,curriculum_subject_id").eq("id", syllabus.course_offering_id).maybeSingle();
  const { data: curriculum } = offering ? await supabase.from("curriculum_subjects")
    .select("subject_id").eq("id", offering.curriculum_subject_id).maybeSingle() : { data: null };
  const { data: subject } = curriculum ? await supabase.from("subjects").select("name").eq("id", curriculum.subject_id).maybeSingle() : { data: null };
  const options = date && sessionRows.length ? sessionRows : await (async () => {
    const { data } = await supabase.from("syllabus_sessions")
      .select("id,row_order,week_number,planned_date,activity_number,unit_title,topic,teaching_form,duration_minutes,location,independent_work")
      .eq("syllabus_id", syllabusId).neq("topic", "").order("row_order", { ascending: true });
    return (data ?? []) as Session[];
  })();

  return (
    <main className="page-content teacher-content plan-builder">
      <div className="breadcrumbs page-breadcrumbs"><Link href={"/docente/silabo/" + syllabusId}>Sílabo y Anexo 1</Link><span>/</span>Nuevo plan de clase</div>
      <div className="page-heading compact-heading"><div><p className="eyebrow">PLAN DE CLASE · {subject?.name ?? "ASIGNATURA"} · PARALELO {offering?.parallel ?? "—"}</p>
        <h1>Prepara la próxima sesión</h1><p>Elige la fecha para cargar los temas programados en el Anexo 1. Puedes vincular varios temas a una sesión de dos horas.</p></div></div>
      {query.error && <div className="form-error" role="alert">{query.error === "datos" ? "Selecciona al menos un tema y completa la fecha y la duración." : "No se pudo guardar. Verifica que el período esté abierto y los temas sigan disponibles."}</div>}

      <section className="surface-card date-picker-card">
        <div><span className="step-index">01</span><div><span className="tiny-label">FECHA DE CLASE</span><strong>Busca actividades planificadas</strong><small>Los temas con la misma fecha aparecen seleccionables.</small></div></div>
        <form method="get" className="date-picker-form">
          <input aria-label="Fecha de clase" type="date" name="fecha" defaultValue={date} required />
          <button className="button button-outline" type="submit">Cargar temas <span>→</span></button>
        </form>
      </section>

      {date && !sessionRows.length && <div className="calendar-help"><span>i</span><p>No hay una actividad con esa fecha exacta. Puedes escoger una fila de otra fecha y asociarla manualmente; la matriz conserva su fecha original.</p></div>}

      <form action={createClassPlanAction} className="plan-form">
        <input type="hidden" name="syllabus_id" value={syllabusId} />
        <input type="hidden" name="class_date" value={date} />
        <section className="surface-card plan-topics-card">
          <div className="section-top"><div><span className="tiny-label">02 · TEMAS DE LA SESIÓN</span><h2>{date ? "Actividades para " + date : "Selecciona una fecha para continuar"}</h2></div><span className="count-badge">{options.length}</span></div>
          {options.length ? <div className="topic-options">{options.map((session) => (
            <label className="topic-option" key={session.id}>
              <input type="checkbox" name="session_ids" value={session.id} defaultChecked={Boolean(date && sessionRows.some((sameDate) => sameDate.id === session.id))} />
              <span className="topic-week">S{session.week_number ?? "—"}<small>{session.activity_number ? "ACT. " + session.activity_number : "UNIDAD"}</small></span>
              <span className="topic-copy"><strong>{session.topic || session.unit_title || "Actividad sin título"}</strong><small>{session.planned_date ? "Fecha matriz: " + session.planned_date : "Sin fecha"}{session.teaching_form ? " · " + session.teaching_form : ""}{session.duration_minutes ? " · " + session.duration_minutes + " min" : ""}</small></span>
              <span className="topic-select-mark">✓</span>
            </label>
          ))}</div> : <div className="empty-state"><strong>Primero agrega actividades en el Anexo 1</strong><p>Guarda la matriz con temas antes de crear un plan de clase.</p></div>}
        </section>

        <section className="surface-card plan-details-card">
          <div className="section-top"><div><span className="tiny-label">03 · DATOS DE LA SESIÓN</span><h2>Organiza la clase</h2></div></div>
          <div className="plan-meta-fields">
            <label>Número de actividad<input name="activity_number" placeholder="Se completa según el tema vinculado" /></label>
            <label>Duración total (minutos)<input name="duration_minutes" type="number" min="1" defaultValue={sessionRows.reduce((sum, row) => sum + (row.duration_minutes ?? 60), 0) || 60} required /></label>
            <label>Método<select name="method" defaultValue=""><option value="">Selecciona o escribe abajo</option><option>Expositivo</option><option>Problémico</option><option>Demostrativo</option><option>Experimental</option><option>Aprendizaje colaborativo</option><option>Resolución de problemas</option><option>Otro</option></select><input name="method_other" placeholder="Especifica otro método" /></label>
            <label>Forma de enseñanza<select name="teaching_form" defaultValue={sessionRows[0]?.teaching_form ?? ""}><option value="">Selecciona</option><option>Conferencia</option><option>Seminario</option><option>Clase práctica</option><option>Taller</option><option>Laboratorio</option><option>Evaluación</option><option>Otro</option></select><input name="teaching_form_other" placeholder="Especifica otra forma" /></label>
            <label>Lugar<input name="location" placeholder="Aula o laboratorio" defaultValue={sessionRows[0]?.location ?? ""} /></label>
          </div>
          <label className="textarea-field">Temas que se anunciarán<textarea name="topic_announcement" rows={2} placeholder="Se completa con las actividades seleccionadas del Anexo 1." defaultValue={sessionRows.map((row) => row.topic).filter(Boolean).join("; ")} /></label>
          <label className="textarea-field">Recursos didácticos<textarea name="resources" rows={2} placeholder="Pizarra, guía de estudios, proyector, simulador…" /></label>
        </section>

        <section className="surface-card plan-details-card">
          <div className="section-top"><div><span className="tiny-label">04 · DESARROLLO</span><h2>Completa el plan pedagógico</h2></div></div>
          <h3 className="form-subheading">Introducción</h3>
          <div className="plan-meta-fields">
            <label>Saludo y organización<textarea name="greeting_and_organization" rows={2} placeholder="Organización inicial y presentación del objetivo…" /></label>
            <label>Análisis de asistencia<textarea name="attendance" rows={2} placeholder="Registro y seguimiento de asistencia…" /></label>
            <label>Trabajo con la fecha<textarea name="work_with_date" rows={2} placeholder="Actividad o reflexión con la fecha…" /></label>
            <label>Chequeo del trabajo independiente<textarea name="independent_work_check" rows={2} placeholder="Revisión de la tarea anterior…" /></label>
            <label>Motivación<textarea name="motivation" rows={2} placeholder="Conecta el tema con una situación significativa…" /></label>
            <label>Objetivo de la clase<textarea name="objective" rows={2} placeholder="¿Qué podrá hacer el estudiante al finalizar?" /></label>
          </div>
          <label className="textarea-field">Desarrollo de los temas<textarea name="development" rows={8} placeholder="Organiza la explicación, las actividades y las indicaciones para cada tema." /></label>
        </section>

        <section className="surface-card plan-details-card">
          <div className="section-top"><div><span className="tiny-label">05 · CIERRE Y EVALUACIÓN</span><h2>Consolida el aprendizaje</h2></div></div>
          <div className="plan-meta-fields">
            <label>Conclusiones de la clase<textarea name="class_conclusions" rows={2} placeholder="Recoge los principales aprendizajes…" /></label>
            <label>Evaluación del aprendizaje<textarea name="learning_assessment" rows={2} placeholder="Evidencias, preguntas o criterios observables…" /></label>
            <label>Trabajo independiente<textarea name="independent_work" rows={2} placeholder="Actividad que realizarán fuera del aula…" /></label>
            <label>Tema de la próxima clase<textarea name="next_class_topic" rows={2} placeholder="Próximo contenido planificado…" /></label>
            <label>Técnica de cierre<textarea name="closing_technique" rows={2} placeholder="Por ejemplo: PNI, pregunta reflexiva, síntesis…" /></label>
            <label>Revisión de la técnica de cierre<textarea name="closing_technique_review" rows={2} placeholder="Cómo se aplicará durante la introducción…" /></label>
          </div>
          <div className="plan-meta-fields bibliography-fields">
            <label>Bibliografía básica<textarea name="bibliography_basic" rows={3} placeholder="Referencias de la unidad…" /></label>
            <label>Bibliografía de consulta<textarea name="bibliography_reference" rows={3} placeholder="Fuentes complementarias…" /></label>
          </div>
        </section>

        <div className="plan-submit-row"><Link className="button button-outline" href={"/docente/silabo/" + syllabusId}>Volver al sílabo</Link>
          <button className="button button-primary" type="submit" disabled={!date || !options.length}>Guardar plan de clase <span>↗</span></button></div>
      </form>
    </main>
  );
}
