import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export default async function SyllabusPage({ params }: Props) {
  const profile = await requireTeacher();
  const { id } = await params;
  const supabase = await createClient();
  const { data: syllabus } = await supabase.from("syllabi")
    .select("id,course_offering_id,status,content")
    .eq("id", id).maybeSingle();
  if (!syllabus) notFound();

  const { data: plans } = await supabase.from("class_plans")
    .select("id,plan_number,class_date,duration_minutes,status")
    .eq("syllabus_id", syllabus.id)
    .order("class_date", { ascending: false });

  const { data: offering } = await supabase.from("course_offerings")
    .select("id,parallel,curriculum_subject_id,semester_offering_id")
    .eq("id", syllabus.course_offering_id).maybeSingle();
  let subjectName = "Asignatura";
  let careerName = "Carrera";
  let periodName = "Período";
  if (offering) {
    const [curriculumResult, semesterOfferingResult] = await Promise.all([
      supabase.from("curriculum_subjects").select("subject_id,semester_id").eq("id", offering.curriculum_subject_id).maybeSingle(),
      supabase.from("semester_offerings").select("academic_offering_id").eq("id", offering.semester_offering_id).maybeSingle(),
    ]);
    if (curriculumResult.data) {
      const [subjectResult, semesterResult] = await Promise.all([
        supabase.from("subjects").select("name").eq("id", curriculumResult.data.subject_id).maybeSingle(),
        supabase.from("semesters").select("career_id").eq("id", curriculumResult.data.semester_id).maybeSingle(),
      ]);
      subjectName = subjectResult.data?.name ?? subjectName;
      if (semesterResult.data) {
        const career = await supabase.from("careers").select("name").eq("id", semesterResult.data.career_id).maybeSingle();
        careerName = career.data?.name ?? careerName;
      }
    }
    if (semesterOfferingResult.data) {
      const academic = await supabase.from("academic_offerings").select("period_id").eq("id", semesterOfferingResult.data.academic_offering_id).maybeSingle();
      if (academic.data) {
        const period = await supabase.from("academic_periods").select("name,status").eq("id", academic.data.period_id).maybeSingle();
        periodName = period.data?.name ?? periodName;
      }
    }
  }

  return (
    <main className="page-content teacher-content syllabus-content">
      <div className="breadcrumbs page-breadcrumbs"><Link href="/docente">Mis asignaturas</Link><span>/</span>{subjectName}<span>/</span>Sílabo</div>
      <div className="page-heading syllabus-heading">
        <div><p className="eyebrow">SÍLABO · {periodName} · PARALELO {offering?.parallel ?? "—"}</p>
          <h1>{subjectName}</h1><p>{careerName} · Responsable: {profile.full_name || "Docente"}</p></div>
        <span className={"status-pill status-" + (syllabus.status === "aprobado" ? "open" : "draft")}>{syllabus.status === "aprobado" ? "Aprobado" : "Borrador"}</span>
      </div>
      <section className="surface-card syllabus-sections">
        <div className="syllabus-section-title"><span className="step-index">01</span><div><span className="tiny-label">DATOS INFORMATIVOS</span><h2>Identificación vinculada a la oferta</h2></div></div>
        <div className="metadata-grid">
          <div><span>Carrera</span><strong>{careerName}</strong></div><div><span>Asignatura</span><strong>{subjectName}</strong></div>
          <div><span>Período</span><strong>{periodName}</strong></div><div><span>Paralelo</span><strong>{offering?.parallel ?? "—"}</strong></div>
          <div><span>Docente responsable</span><strong>{profile.full_name || "—"}</strong></div><div><span>Modalidad</span><strong>{offering ? "Según oferta académica" : "—"}</strong></div>
        </div>
        <p className="metadata-note">Estos datos vienen de la oferta institucional. Puedes ampliarlos en el paso I del contenido del sílabo.</p>
      </section>
      <section className="surface-card plan-list-section">
        <div className="section-top"><div><span className="tiny-label">PLANIFICACIÓN PREVIA A CLASE</span><h2>Planes de clase</h2></div>
          <Link className="button button-primary button-small" href={"/docente/silabo/" + syllabus.id + "/planificar"}>Nuevo plan <span>↗</span></Link></div>
        {plans?.length ? <div className="plan-list">{plans.map((plan) => <Link className="plan-list-row" href={"/docente/plan/" + plan.id} key={plan.id}>
          <span className="plan-list-date">{plan.class_date}</span><span className="plan-list-copy"><strong>Plan de clase N.º {plan.plan_number}</strong><small>{Math.round(plan.duration_minutes / 60 * 10) / 10} horas · {plan.status === "finalizado" ? "Finalizado" : "Borrador"}</small></span><b>→</b>
        </Link>)}</div> : <p className="plan-list-empty">Cuando crees un plan desde una fecha del Anexo 1, aparecerá aquí.</p>}
      </section>
      <section className="surface-card plan-list-section">
        <div className="section-top"><div><span className="tiny-label">SECCIONES NARRATIVAS · 12 PASOS CON AUTOGUARDADO</span><h2>Completa el contenido del sílabo</h2></div>
          <Link className="button button-outline button-small" href={"/docente/silabo/" + syllabus.id + "/contenido"}>Editar contenido <span>↗</span></Link></div>
        <p className="plan-list-empty">Multi-step form I–XII con autoguardado: datos, fundamentación, objetivos, evaluación, contenidos, plan temático, unidades, metodología, recursos, bibliografía, firmas y Anexo 1.</p>
      </section>
    </main>
  );
}
