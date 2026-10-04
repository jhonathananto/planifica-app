import { createClient } from "@/lib/supabase/server";
import { addCalendarEventAction, addCareerToPeriodAction, addSemesterToPeriodAction, assignCourseAction } from "./actions";

type Props = { searchParams: Promise<{ error?: string; guardado?: string }> };
type Row = { id: string; name?: string; code?: string; status?: string; career_id?: string; period_id?: string; semester_id?: string; subject_id?: string; teacher_id?: string; curriculum_subject_id?: string; academic_offering_id?: string; semester_offering_id?: string; parallel?: string; modality?: string; is_enabled?: boolean };
type Profile = { user_id: string; full_name: string; email: string; role: string; is_active: boolean };

const errorText: Record<string, string> = {
  carrera: "La carrera ya estaba habilitada en ese período o faltan datos.",
  semestre: "El semestre no corresponde a la carrera seleccionada o ya está habilitado.",
  asignatura: "Revisa que la asignatura pertenezca al semestre y el docente tenga una cuenta activa.",
  calendario: "No se pudo guardar la actividad del calendario. Verifica el período y las fechas.",
};

export default async function OfferingPage({ searchParams }: Props) {
  const query = await searchParams;
  const supabase = await createClient();
  const [periodResult, careerResult, semesterResult, subjectResult, curriculumResult, academicResult, semesterOfferingResult, courseResult, teacherResult, eventResult] = await Promise.all([
    supabase.from("academic_periods").select("id,name,code,status").order("starts_on", { ascending: false }),
    supabase.from("careers").select("id,name,code").eq("is_active", true).order("name"),
    supabase.from("semesters").select("id,name,career_id,level_number").eq("is_active", true).order("level_number"),
    supabase.from("subjects").select("id,name,code").eq("is_active", true).order("name"),
    supabase.from("curriculum_subjects").select("id,semester_id,subject_id").eq("is_active", true),
    supabase.from("academic_offerings").select("id,period_id,career_id,is_enabled"),
    supabase.from("semester_offerings").select("id,academic_offering_id,career_id,semester_id,is_enabled"),
    supabase.from("course_offerings").select("id,semester_offering_id,semester_id,curriculum_subject_id,teacher_id,parallel,modality,is_enabled"),
    supabase.from("profiles").select("user_id,full_name,email,role,is_active").eq("role", "docente").eq("is_active", true).order("full_name"),
    supabase.from("academic_calendar_events").select("id,period_id,label,event_type,starts_on,ends_on").order("starts_on"),
  ]);
  const periods = (periodResult.data ?? []) as Row[];
  const careers = (careerResult.data ?? []) as Row[];
  const semesters = (semesterResult.data ?? []) as (Row & { level_number: number })[];
  const subjects = (subjectResult.data ?? []) as Row[];
  const curriculum = (curriculumResult.data ?? []) as (Row & { semester_id: string; subject_id: string })[];
  const academicOfferings = (academicResult.data ?? []) as Row[];
  const semesterOfferings = (semesterOfferingResult.data ?? []) as Row[];
  const courses = (courseResult.data ?? []) as Row[];
  const teachers = (teacherResult.data ?? []) as Profile[];
  const events = (eventResult.data ?? []) as (Row & { label: string; event_type: string; starts_on: string; ends_on: string })[];
  const byId = (rows: Row[]) => new Map(rows.map((row) => [row.id, row]));
  const periodById = byId(periods);
  const careerById = byId(careers);
  const semesterById = byId(semesters);
  const subjectById = byId(subjects);
  const profileById = new Map(teachers.map((row) => [row.user_id, row]));
  const curriculumById = byId(curriculum);
  const academicById = byId(academicOfferings);
  const semOfferingById = byId(semesterOfferings);

  return (
    <main className="page-content">
      <div className="page-heading compact-heading"><div><p className="eyebrow">OFERTA ACADÉMICA</p>
        <h1>Habilita carreras, niveles y asignaturas</h1><p>La asignación define qué ve cada docente en su espacio.</p></div></div>
      {query.error && <div className="form-error" role="alert">{errorText[query.error] ?? "Revisa los campos ingresados."}</div>}
      {query.guardado && <div className="form-success">Oferta actualizada.</div>}

      <section className="offer-steps">
        <article className="surface-card offer-step"><div className="offer-step-head"><span className="step-index">01</span><div><span className="tiny-label">CARRERAS</span><h2>Habilitar carrera</h2></div></div>
          <form action={addCareerToPeriodAction} className="inline-form">
            <label>Período<select name="period_id" required defaultValue=""><option value="" disabled>Selecciona</option>{periods.map((row) => <option value={row.id} key={row.id}>{row.code} · {row.name} ({row.status})</option>)}</select></label>
            <label>Carrera<select name="career_id" required defaultValue=""><option value="" disabled>Selecciona</option>{careers.map((row) => <option value={row.id} key={row.id}>{row.name}</option>)}</select></label>
            <button className="button button-primary" type="submit" disabled={!periods.length || !careers.length}>Habilitar</button>
          </form>
          <div className="offer-chips">{academicOfferings.map((item) => <span className="offer-chip" key={item.id}>{periodById.get(item.period_id ?? "")?.code} · {careerById.get(item.career_id ?? "")?.name}</span>)}</div>
        </article>

        <article className="surface-card offer-step"><div className="offer-step-head"><span className="step-index">02</span><div><span className="tiny-label">SEMESTRES</span><h2>Habilitar nivel</h2></div></div>
          <form action={addSemesterToPeriodAction} className="inline-form">
            <label>Carrera ofertada<select name="academic_offering_id" required defaultValue=""><option value="" disabled>Selecciona</option>
              {academicOfferings.map((row) => <option value={row.id} key={row.id}>{periodById.get(row.period_id ?? "")?.code} · {careerById.get(row.career_id ?? "")?.name}</option>)}</select></label>
            <label>Semestre<select name="semester_id" required defaultValue=""><option value="" disabled>Selecciona</option>
              {semesters.map((row) => <option value={row.id} key={row.id}>{careerById.get(row.career_id ?? "")?.name} · {row.name}</option>)}</select></label>
            <button className="button button-primary" type="submit" disabled={!academicOfferings.length || !semesters.length}>Habilitar</button>
          </form>
          <div className="offer-chips">{semesterOfferings.map((item) => <span className="offer-chip" key={item.id}>{periodById.get(academicById.get(item.academic_offering_id ?? "")?.period_id ?? "")?.code} · {semesterById.get(item.semester_id ?? "")?.name}</span>)}</div>
        </article>

        <article className="surface-card offer-step offer-step-wide"><div className="offer-step-head"><span className="step-index">03</span><div><span className="tiny-label">ASIGNATURAS Y DOCENTES</span><h2>Crear asignación docente</h2></div></div>
          <form action={assignCourseAction} className="offer-assignment-form">
            <label>Semestre ofertado<select name="semester_offering_id" required defaultValue=""><option value="" disabled>Selecciona</option>
              {semesterOfferings.map((row) => <option value={row.id} key={row.id}>{periodById.get(academicById.get(row.academic_offering_id ?? "")?.period_id ?? "")?.code} · {careerById.get(row.career_id ?? "")?.name} · {semesterById.get(row.semester_id ?? "")?.name}</option>)}</select></label>
            <label>Asignatura curricular<select name="curriculum_subject_id" required defaultValue=""><option value="" disabled>Selecciona</option>
              {curriculum.map((row) => <option value={row.id} key={row.id}>{semesterById.get(row.semester_id)?.name} · {subjectById.get(row.subject_id)?.code} · {subjectById.get(row.subject_id)?.name}</option>)}</select></label>
            <label>Docente<select name="teacher_id" required defaultValue=""><option value="" disabled>Selecciona</option>{teachers.map((row) => <option value={row.user_id} key={row.user_id}>{row.full_name || row.email}</option>)}</select></label>
            <div className="form-pair"><label>Paralelo<input name="parallel" defaultValue="A" required /></label>
              <label>Modalidad<select name="modality" defaultValue="Presencial"><option>Presencial</option><option>En línea</option><option>Híbrida</option><option>Dual</option></select></label></div>
            <div className="form-pair"><label>Día de clase<select name="weekday" defaultValue=""><option value="">Aún sin horario</option><option value="lunes">Lunes</option><option value="martes">Martes</option><option value="miércoles">Miércoles</option><option value="jueves">Jueves</option><option value="viernes">Viernes</option><option value="sábado">Sábado</option></select></label>
              <label>Hora inicial<input name="start_time" type="time" /></label></div>
            <label>Duración de la sesión (minutos)<input name="class_duration" type="number" min="1" placeholder="60" /></label>
            <button className="button button-primary" type="submit" disabled={!semesterOfferings.length || !curriculum.length || !teachers.length}>Asignar asignatura</button>
          </form>
          <p className="field-help">La hora semanal ayuda a proponer fechas. El docente podrá confirmar o ajustar la fecha de cada actividad en el Anexo 1.</p>
        </article>

        <article className="surface-card offer-step"><div className="offer-step-head"><span className="step-index">04</span><div><span className="tiny-label">CALENDARIO</span><h2>Agregar evento institucional</h2></div></div>
          <form action={addCalendarEventAction} className="stack-form">
            <label>Período<select name="period_id" required defaultValue=""><option value="" disabled>Selecciona</option>{periods.map((row) => <option value={row.id} key={row.id}>{row.name}</option>)}</select></label>
            <label>Actividad<input name="label" required placeholder="Feriado, evaluación parcial…" /></label>
            <div className="form-pair"><label>Inicio<input name="starts_on" type="date" required /></label><label>Fin<input name="ends_on" type="date" required /></label></div>
            <label>Tipo<select name="event_type" defaultValue="institucional"><option value="institucional">Institucional</option><option value="feriado">Feriado</option><option value="evaluacion">Evaluación</option><option value="inicio_clases">Inicio de clases</option><option value="fin_clases">Fin de clases</option></select></label>
            <label>Detalle<input name="details" placeholder="Opcional" /></label>
            <label className="checkbox-label"><input name="is_teaching_day" type="checkbox" /> Es día de clases</label>
            <button className="button button-primary button-full" type="submit" disabled={!periods.length}>Guardar evento</button>
          </form>
          <div className="calendar-event-list">{events.slice(0, 6).map((event) => <div className="catalog-row" key={event.id}><strong>{event.label}</strong><small>{periodById.get(event.period_id ?? "")?.code} · {event.starts_on}{event.ends_on !== event.starts_on ? " — " + event.ends_on : ""}</small></div>)}</div>
        </article>
      </section>

      <section className="surface-card assigned-offers">
        <div className="section-top"><div><span className="tiny-label">ASIGNACIONES</span><h2>Docentes, materias y paralelos</h2></div><span className="count-badge">{courses.length}</span></div>
        <div className="assigned-list">{courses.map((course) => {
          const curriculumRow = curriculumById.get(course.curriculum_subject_id ?? "");
          const subject = curriculumRow ? subjectById.get(curriculumRow.subject_id) : null;
          const semesterOffer = semOfferingById.get(course.semester_offering_id ?? "");
          const academic = semesterOffer ? academicById.get(semesterOffer.academic_offering_id ?? "") : null;
          const period = academic ? periodById.get(academic.period_id ?? "") : null;
          const teacher = profileById.get(course.teacher_id ?? "");
          const career = academic ? careerById.get(academic.career_id ?? "") : null;
          const semester = semesterById.get(course.semester_id ?? "");
          return <div className="assigned-row" key={course.id}>
            <span className="assigned-mark">▦</span><span className="assigned-subject"><strong>{subject?.name ?? "Asignatura"}</strong><small>{subject?.code} · {career?.name} · {semester?.name}</small></span>
            <span className="assigned-teacher"><small>DOCENTE</small><strong>{teacher?.full_name || teacher?.email || "Pendiente"}</strong></span>
            <span className="assigned-period"><small>PERÍODO</small><strong>{period?.code ?? "—"} · {course.parallel}</strong></span>
            <span className={"status-pill " + (course.is_enabled ? "status-open" : "status-cerrado")}>{course.is_enabled ? "Habilitada" : "Pausada"}</span>
          </div>;
        })}
        {!courses.length && <div className="empty-state"><strong>Las asignaciones aparecerán aquí</strong><p>Habilita carrera y semestre antes de asignar materias.</p></div>}</div>
      </section>
    </main>
  );
}
