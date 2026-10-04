import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { saveSyllabusContentAction } from "./actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; guardado?: string }> };
type Data = Record<string, any>;

const scoreRows = [
  { key: "classroom", label: "Actividades en el aula de clase" },
  { key: "reinforcement", label: "Actividades de refuerzo académico" },
  { key: "practical", label: "Actividades prácticas y experimentales" },
  { key: "evaluation", label: "Evaluación" },
];
const evaluationChoices = {
  classroom_activities: ["Resumen de clase", "Talleres teóricos", "Mesas de trabajo", "Debates", "Seminarios", "Participación en el aula", "Proyectos en aula"],
  independent_activities: ["Ensayos", "Resúmenes", "Exposiciones", "Presentaciones digitales", "Revisiones bibliográficas"],
  practical_activities: ["Maquetas", "Experimentos", "Socializaciones", "Talleres prácticos", "Visitas técnicas", "Aplicación de instrumentos", "Dramatizaciones", "Resolución de problemas prácticos"],
  summative_activities: ["Cuestionarios", "Pruebas orales", "Pruebas escritas", "Pruebas virtuales", "Actividades prácticas o experimentales"],
};
const fieldLabels: Record<string, string> = {
  profile_contribution: "Consecución al perfil de egreso",
  other_subjects_contribution: "Aporte a otras asignaturas",
  general_capabilities: "Capacidades generales para el aprendizaje",
  cultural_formation: "Contribución a la formación cultural",
  problem: "Problema que aborda la asignatura",
  study_object: "Objeto de estudio",
  general_objective: "Objetivo general de la asignatura",
  specific_objectives: "Objetivos específicos",
};

function Field({ name, label, value = "", rows = 3, placeholder = "" }: { name: string; label: string; value?: string; rows?: number; placeholder?: string }) {
  return <label className="long-field">{label}<textarea name={name} rows={rows} defaultValue={value ?? ""} placeholder={placeholder} /></label>;
}

function CheckChoices({ name, values, selected = [] }: { name: string; values: string[]; selected?: string[] }) {
  return <div className="choice-grid">{values.map((value) => <label className="choice-option" key={value}>
    <input type="checkbox" name={name} value={value} defaultChecked={selected.includes(value)} /><span>{value}</span>
  </label>)}</div>;
}

export default async function SyllabusContentPage({ params, searchParams }: Props) {
  const profile = await requireTeacher();
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: syllabus } = await supabase.from("syllabi")
    .select("id,course_offering_id,content,status")
    .eq("id", id).maybeSingle();
  if (!syllabus) notFound();
  const content = (syllabus.content ?? {}) as Data;
  const foundation = (content.fundamentacion ?? {}) as Data;
  const evaluation = (content.evaluacion ?? {}) as Data;
  const unitContent = (content.unidades?.units ?? []) as Data[];
  const methodology = (content.metodologia ?? {}) as Data;
  const resources = (content.recursos_bibliografia ?? {}) as Data;

  const { data: offering } = await supabase.from("course_offerings")
    .select("parallel,curriculum_subject_id,semester_offering_id,modality")
    .eq("id", syllabus.course_offering_id).maybeSingle();
  const { data: curriculum } = offering ? await supabase.from("curriculum_subjects")
    .select("subject_id,semester_id,default_hours").eq("id", offering.curriculum_subject_id).maybeSingle() : { data: null };
  const { data: subject } = curriculum ? await supabase.from("subjects")
    .select("name,code").eq("id", curriculum.subject_id).maybeSingle() : { data: null };
  const { data: semester } = curriculum ? await supabase.from("semesters")
    .select("name,career_id").eq("id", curriculum.semester_id).maybeSingle() : { data: null };
  const { data: career } = semester ? await supabase.from("careers")
    .select("name,code").eq("id", semester.career_id).maybeSingle() : { data: null };
  const { data: semesterOffering } = offering ? await supabase.from("semester_offerings")
    .select("academic_offering_id").eq("id", offering.semester_offering_id).maybeSingle() : { data: null };
  const { data: academicOffering } = semesterOffering ? await supabase.from("academic_offerings")
    .select("period_id").eq("id", semesterOffering.academic_offering_id).maybeSingle() : { data: null };
  const { data: period } = academicOffering ? await supabase.from("academic_periods")
    .select("name,starts_on,ends_on,teaching_weeks").eq("id", academicOffering.period_id).maybeSingle() : { data: null };

  const errorText: Record<string, string> = {
    ponderacion: "La ponderación no puede superar 10 puntos por parcial. Revisa los valores.",
    horas: "Las horas deben ser números iguales o mayores a cero.",
    seccion: "La sección indicada no es válida.",
    guardar: "No se pudo guardar. Comprueba que el período siga abierto.",
  };

  return (
    <main className="page-content teacher-content syllabus-content">
      <div className="breadcrumbs page-breadcrumbs"><Link href={"/docente/silabo/" + id}>Sílabo</Link><span>/</span>Contenido</div>
      <div className="page-heading compact-heading"><div><p className="eyebrow">SÍLABO · CONTENIDO ACADÉMICO</p>
        <h1>Completa las secciones del sílabo</h1><p>Los datos de la oferta se completan automáticamente. Guarda las secciones por separado como borrador.</p></div></div>
      {query.error && <div className="form-error" role="alert">{errorText[query.error] ?? "No fue posible guardar los cambios."}</div>}
      {query.guardado && <div className="form-success">Sección guardada correctamente.</div>}

      <section className="surface-card syllabus-sections">
        <div className="syllabus-section-title"><span className="step-index">01</span><div><span className="tiny-label">DATOS INFORMATIVOS · AUTOMÁTICO</span><h2>Tomados de la oferta académica</h2></div></div>
        <div className="metadata-grid">
          <div><span>Carrera y código</span><strong>{career?.name ?? "—"} · {career?.code ?? ""}</strong></div>
          <div><span>Asignatura y código</span><strong>{subject?.name ?? "—"} · {subject?.code ?? ""}</strong></div>
          <div><span>Nivel / semestre</span><strong>{semester?.name ?? "—"}</strong></div>
          <div><span>Docente</span><strong>{profile.full_name || "—"}</strong></div>
          <div><span>Período académico</span><strong>{period?.name ?? "—"} · {period?.starts_on ?? ""} a {period?.ends_on ?? ""}</strong></div>
          <div><span>Paralelo / modalidad</span><strong>{offering?.parallel ?? "—"} · {offering?.modality ?? "—"}</strong></div>
          <div><span>Duración</span><strong>{period?.teaching_weeks ?? 16} semanas · {curriculum?.default_hours?.total ?? "Horas por distribuir"}</strong></div>
        </div>
        <p className="metadata-note">Para cambiar estos datos debes pedir al administrador que actualice la oferta.</p>
      </section>

      <section className="surface-card syllabus-form-card">
        <div className="form-card-head"><span className="step-index">02</span><div><span className="tiny-label">FUNDAMENTACIÓN Y OBJETIVOS · TEXTO DOCENTE</span><h2>Contexto de la asignatura</h2></div></div>
        <form action={saveSyllabusContentAction}>
          <input type="hidden" name="syllabus_id" value={id} /><input type="hidden" name="section" value="fundamentacion" />
          <div className="syllabus-text-grid">{Object.entries(fieldLabels).map(([key, label]) => <Field key={key} name={key} label={label} value={foundation[key]} rows={key === "specific_objectives" ? 4 : 3} />)}</div>
          <div className="save-section-row"><span>Último guardado: fundamentación</span><button className="button button-primary" type="submit">Guardar borrador <span>✓</span></button></div>
        </form>
      </section>

      <section className="surface-card syllabus-form-card">
        <div className="form-card-head"><span className="step-index">03</span><div><span className="tiny-label">SISTEMA DE EVALUACIÓN · TEXTO Y SELECCIONES</span><h2>Define cómo evaluarás</h2></div></div>
        <form action={saveSyllabusContentAction}>
          <input type="hidden" name="syllabus_id" value={id} /><input type="hidden" name="section" value="evaluacion" />
          <div className="syllabus-text-grid">
            <Field name="diagnostic" label="Evaluación diagnóstica" value={evaluation.diagnostic} placeholder="Establece el esquema conceptual de partida." />
            <Field name="formative" label="Evaluación formativa" value={evaluation.formative} placeholder="Seguimiento y retroalimentación durante el proceso." />
            <Field name="final" label="Evaluación final" value={evaluation.final} placeholder="Evidencias finales, presentación y defensa." />
            <Field name="formative_criteria" label="Criterios de evaluación formativa" value={evaluation.formative_criteria} />
          </div>
          <div className="evaluation-choice-group"><h3>Actividades en el aula</h3><CheckChoices name="classroom_activities" values={evaluationChoices.classroom_activities} selected={evaluation.classroom_activities} /></div>
          <div className="evaluation-choice-group"><h3>Trabajo autónomo</h3><CheckChoices name="independent_activities" values={evaluationChoices.independent_activities} selected={evaluation.independent_activities} /></div>
          <div className="evaluation-choice-group"><h3>Prácticas y experimentación</h3><CheckChoices name="practical_activities" values={evaluationChoices.practical_activities} selected={evaluation.practical_activities} /></div>
          <div className="evaluation-choice-group"><h3>Evaluación sumativa</h3><CheckChoices name="summative_activities" values={evaluationChoices.summative_activities} selected={evaluation.summative_activities} /></div>
          <div className="evaluation-choice-group"><h3>Puntaje por parcial</h3><p className="field-help">La suma de cada parcial se valida sobre 10 puntos.</p>
            <div className="score-grid score-head"><span>Criterio</span><span>Primer parcial</span><span>Segundo parcial</span></div>
            {scoreRows.map((row) => {
              const score = (evaluation.point_distribution ?? []).find((item: Data) => item.label === row.label);
              return <div className="score-grid" key={row.key}><strong>{row.label}</strong>
                <input name={"score_" + row.key + "_first"} type="number" step="0.1" min="0" max="10" defaultValue={score?.first_partial ?? ""} aria-label={row.label + " primer parcial"} />
                <input name={"score_" + row.key + "_second"} type="number" step="0.1" min="0" max="10" defaultValue={score?.second_partial ?? ""} aria-label={row.label + " segundo parcial"} />
              </div>;
            })}
            <p className="field-help">Totales guardados: primer parcial {evaluation.first_partial_total ?? "—"} / 10 · segundo parcial {evaluation.second_partial_total ?? "—"} / 10.</p>
          </div>
          <div className="save-section-row"><span>Los criterios pueden cambiar según normativa institucional.</span><button className="button button-primary" type="submit">Guardar evaluación <span>✓</span></button></div>
        </form>
      </section>

      <section className="surface-card syllabus-form-card">
        <div className="form-card-head"><span className="step-index">04</span><div><span className="tiny-label">CONTENIDOS Y PLAN TEMÁTICO · 4 UNIDADES</span><h2>Organiza conocimientos, habilidades y horas</h2></div></div>
        <form action={saveSyllabusContentAction}>
          <input type="hidden" name="syllabus_id" value={id} /><input type="hidden" name="section" value="unidades" />
          <div className="unit-editor-list">{[0, 1, 2, 3].map((index) => {
            const unit = unitContent[index] ?? {};
            const prefix = "unit_" + (index + 1) + "_";
            return <article className="unit-editor" key={index}>
              <div className="unit-editor-heading"><span>UNIDAD {["I", "II", "III", "IV"][index]}</span><input name={prefix + "title"} defaultValue={unit.title ?? ("Unidad " + ["I", "II", "III", "IV"][index])} /></div>
              <div className="syllabus-text-grid">
                <Field name={prefix + "knowledge"} label="Sistema de conocimientos" value={unit.knowledge} />
                <Field name={prefix + "skills"} label="Sistema de habilidades" value={unit.skills} />
                <Field name={prefix + "values"} label="Sistema de valores" value={unit.values} rows={2} />
              </div>
              <div className="hours-entry-grid">
                {[
                  ["C", "Conferencias"], ["CP", "Clases prácticas"], ["S", "Seminarios"], ["T", "Talleres"],
                  ["L", "Laboratorios"], ["E", "Evaluaciones"], ["THP_autonomous", "Práctico autónomo"], ["TI", "Trabajo independiente"],
                ].map(([key, label]) => <label key={key}>{label}<input name={prefix + "hours_" + key} type="number" min="0" step="1" defaultValue={unit.hours?.[key] ?? 0} /></label>)}
                <div className="hours-derived"><span>Horas con docente</span><strong>{unit.hours_with_teacher ?? "Calculado al guardar"}</strong></div>
                <div className="hours-derived"><span>Total de la unidad</span><strong>{unit.total_hours ?? "Calculado al guardar"}</strong></div>
              </div>
            </article>;
          })}</div>
          <div className="save-section-row"><span>El total por unidad suma horas con docente, práctico autónomo y trabajo independiente.</span><button className="button button-primary" type="submit">Guardar unidades <span>✓</span></button></div>
        </form>
      </section>

      <section className="surface-card syllabus-form-card">
        <div className="form-card-head"><span className="step-index">05</span><div><span className="tiny-label">ORIENTACIONES METODOLÓGICAS · TEXTO DOCENTE</span><h2>Explica cómo se desarrollará el aprendizaje</h2></div></div>
        <form action={saveSyllabusContentAction}>
          <input type="hidden" name="syllabus_id" value={id} /><input type="hidden" name="section" value="metodologia" />
          <div className="syllabus-text-grid">
            <label className="long-field">Relación con el modelo educativo<select name="educational_model" defaultValue={methodology.educational_model ?? ""}><option value="">Selecciona</option><option>Constructivista</option><option>Conectivista</option><option>Aprendizaje basado en competencias</option><option>Otro</option></select></label>
            <Field name="theory_practice" label="Interrelación teoría y práctica" value={methodology.theory_practice} />
            <Field name="student_motivation" label="Acciones para la motivación" value={methodology.student_motivation} />
            <Field name="critical_thinking" label="Desarrollo del pensamiento crítico" value={methodology.critical_thinking} />
            <Field name="inclusive_learning" label="Atención a necesidades educativas" value={methodology.inclusive_learning} />
            <Field name="learning_capacities" label="Capacidades generales para el aprendizaje" value={methodology.learning_capacities} />
            <Field name="autonomous_work" label="Orientación del trabajo autónomo" value={methodology.autonomous_work} />
          </div>
          <div className="save-section-row"><span>Los enfoques seleccionables se pueden ampliar desde el catálogo institucional.</span><button className="button button-primary" type="submit">Guardar metodología <span>✓</span></button></div>
        </form>
      </section>

      <section className="surface-card syllabus-form-card">
        <div className="form-card-head"><span className="step-index">06</span><div><span className="tiny-label">RECURSOS Y REFERENCIAS · TEXTO DOCENTE</span><h2>Prepara el material de estudio</h2></div></div>
        <form action={saveSyllabusContentAction}>
          <input type="hidden" name="syllabus_id" value={id} /><input type="hidden" name="section" value="recursos_bibliografia" />
          <div className="syllabus-text-grid">
            <Field name="basic_resources" label="Recursos básicos" value={resources.basic_resources} placeholder="Pizarra, marcadores, borrador…" />
            <Field name="audiovisual_resources" label="Recursos audiovisuales" value={resources.audiovisual_resources} placeholder="Computadora, proyector, parlantes…" />
            <Field name="technical_resources" label="Recursos técnicos" value={resources.technical_resources} placeholder="Guías, plataforma, simuladores…" />
            <Field name="basic_bibliography" label="Bibliografía básica" value={resources.basic_bibliography} rows={4} />
            <Field name="reference_bibliography" label="Bibliografía de consulta" value={resources.reference_bibliography} rows={4} />
          </div>
          <div className="save-section-row"><span>Una referencia por línea; puedes incluir autor, año, título, editorial, URL e ISBN.</span><button className="button button-primary" type="submit">Guardar recursos y bibliografía <span>✓</span></button></div>
        </form>
      </section>
      <div className="plan-submit-row"><Link className="button button-outline" href={"/docente/silabo/" + id}>Volver al sílabo</Link></div>
    </main>
  );
}

