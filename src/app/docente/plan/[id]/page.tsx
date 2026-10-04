import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type ActivitySnapshot = {
  week_number?: number | null;
  planned_date?: string | null;
  activity_number?: number | null;
  unit_title?: string | null;
  topic?: string | null;
  teaching_form?: string | null;
  duration_minutes?: number | null;
  location?: string | null;
  independent_work?: string | null;
  teaching_aids?: string | null;
};
type JsonSection = Record<string, string | undefined>;

const fieldLabels: Record<string, string> = {
  greeting_and_organization: "Saludo y organización",
  attendance: "Asistencia",
  work_with_date: "Trabajo con la fecha",
  closing_technique_review: "Análisis de la técnica de cierre",
  independent_work_check: "Chequeo del trabajo independiente",
  motivation: "Motivación",
  topic_announcement: "Anuncio del tema",
  objective: "Objetivo de la clase",
  class_conclusions: "Conclusiones de la clase",
  learning_assessment: "Evaluación del aprendizaje",
  independent_work: "Trabajo independiente",
  next_class_topic: "Tema de la próxima clase",
  closing_technique: "Técnica de cierre",
};

export default async function ClassPlanPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeacher();
  const { id } = await params;
  const supabase = await createClient();
  const { data: plan } = await supabase.from("class_plans")
    .select("id,syllabus_id,plan_number,class_date,duration_minutes,status,content")
    .eq("id", id).maybeSingle();
  if (!plan) notFound();

  const [syllabusResult, linksResult] = await Promise.all([
    supabase.from("syllabi").select("course_offering_id").eq("id", plan.syllabus_id).maybeSingle(),
    supabase.from("class_plan_sessions").select("source_activity,sort_order").eq("class_plan_id", plan.id).order("sort_order"),
  ]);
  const syllabus = syllabusResult.data;
  const { data: offering } = syllabus ? await supabase.from("course_offerings")
    .select("parallel,curriculum_subject_id,semester_offering_id")
    .eq("id", syllabus.course_offering_id).maybeSingle() : { data: null };
  const { data: curriculum } = offering ? await supabase.from("curriculum_subjects")
    .select("subject_id,semester_id").eq("id", offering.curriculum_subject_id).maybeSingle() : { data: null };
  const [{ data: subject }, { data: semester }] = curriculum ? await Promise.all([
    supabase.from("subjects").select("name,code").eq("id", curriculum.subject_id).maybeSingle(),
    supabase.from("semesters").select("name,career_id").eq("id", curriculum.semester_id).maybeSingle(),
  ]) : [{ data: null }, { data: null }];
  const { data: career } = semester ? await supabase.from("careers").select("name").eq("id", semester.career_id).maybeSingle() : { data: null };

  const content = (plan.content ?? {}) as Record<string, unknown>;
  const introduction = (content.introduction ?? {}) as JsonSection;
  const conclusions = (content.conclusions ?? {}) as JsonSection;
  const activities = ((linksResult.data ?? []).map((item) => item.source_activity ?? {}) as ActivitySnapshot[]);
  const renderFields = (section: JsonSection, keys: string[]) => keys.filter((key) => section[key]?.trim()).map((key) => (
    <div className="plan-copy-field" key={key}><span>{fieldLabels[key] ?? key}</span><p>{section[key]}</p></div>
  ));

  return (
    <main className="page-content teacher-content plan-view">
      <div className="breadcrumbs page-breadcrumbs"><Link href={"/docente/silabo/" + plan.syllabus_id}>Sílabo y Anexo 1</Link><span>/</span>Plan de clase N.º {plan.plan_number}</div>
      <div className="page-heading"><div><p className="eyebrow">PLAN DE CLASE · {plan.class_date}</p><h1>{subject?.name ?? "Asignatura"}</h1>
        <p>{career?.name ?? "Carrera"} · {semester?.name ?? "Semestre"} · Paralelo {offering?.parallel ?? "—"}</p></div>
        <span className="status-pill status-draft">Borrador</span></div>

      <section className="surface-card plan-view-meta"><div><span>FECHA</span><strong>{plan.class_date}</strong></div><div><span>DURACIÓN</span><strong>{plan.duration_minutes} minutos</strong></div><div><span>N.º DE ACTIVIDAD</span><strong>{String(content.activity_number || "—")}</strong></div><div><span>MÉTODO</span><strong>{String(content.method || "—")}</strong></div></section>
      <section className="surface-card plan-view-section"><span className="tiny-label">TEMAS VINCULADOS AL ANEXO 1</span>
        {activities.map((item, index) => <article className="plan-view-activity" key={index}><span className="topic-week">S{item.week_number ?? "—"}<small>{item.activity_number ? "ACT. " + item.activity_number : "UNIDAD"}</small></span><div><strong>{item.topic || item.unit_title || "Actividad"}</strong><small>{item.teaching_form ?? "Forma de enseñanza pendiente"}{item.duration_minutes ? " · " + item.duration_minutes + " min" : ""}{item.location ? " · " + item.location : ""}</small></div></article>)}
      </section>
      <section className="surface-card plan-view-section"><span className="tiny-label">FORMA DE ENSEÑANZA Y RECURSOS</span><p><strong>Forma:</strong> {String(content.teaching_form || "—")}</p><p><strong>Recursos:</strong> {String(content.resources || "—")}</p></section>
      <section className="surface-card plan-view-section"><span className="tiny-label">INTRODUCCIÓN</span>{renderFields(introduction, Object.keys(fieldLabels).slice(0, 8))}</section>
      <section className="surface-card plan-view-section"><span className="tiny-label">DESARROLLO</span><p className="plan-long-copy">{String(content.development || "Sin desarrollo registrado.")}</p></section>
      <section className="surface-card plan-view-section"><span className="tiny-label">CONCLUSIONES Y EVALUACIÓN</span>{renderFields(conclusions, Object.keys(fieldLabels).slice(8))}</section>
      <section className="surface-card plan-view-section bibliography-view"><span className="tiny-label">BIBLIOGRAFÍA</span>
        <div className="plan-copy-field"><span>Básica</span><p>{String(content.bibliography_basic || "—")}</p></div>
        <div className="plan-copy-field"><span>De consulta</span><p>{String(content.bibliography_reference || "—")}</p></div>
      </section>
      <div className="plan-submit-row"><Link className="button button-outline" href={"/docente/silabo/" + plan.syllabus_id}>Volver al sílabo</Link></div>
    </main>
  );
}

