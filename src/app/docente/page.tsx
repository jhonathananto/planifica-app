import Link from "next/link";
import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createSyllabusAction } from "./actions";
import { SpotlightCard } from "@/components/inspira/spotlight-card";
import { RevealText } from "@/components/inspira/reveal-text";

type CourseOffering = { id: string; parallel: string; modality: string; curriculum_subject_id: string; semester_offering_id: string; is_enabled: boolean };
type CurriculumSubject = { id: string; subject_id: string; semester_id: string };
type SemesterOffering = { id: string; academic_offering_id: string };
type AcademicOffering = { id: string; period_id: string; career_id: string };
type SimpleRow = { id: string; name?: string; code?: string; level_number?: number; status?: string };

export default async function TeacherHomePage() {
  const profile = await requireTeacher();
  const supabase = await createClient();
  const { data: rawOfferings } = await supabase.from("course_offerings")
    .select("id,parallel,modality,curriculum_subject_id,semester_offering_id,is_enabled")
    .eq("teacher_id", profile.user_id);
  const offerings = (rawOfferings ?? []) as CourseOffering[];
  const curriculumIds = [...new Set(offerings.map((o) => o.curriculum_subject_id))];
  const semesterOfferingIds = [...new Set(offerings.map((o) => o.semester_offering_id))];
  const [curriculumResult, semesterOfferingResult, syllabiResult] = await Promise.all([
    curriculumIds.length ? supabase.from("curriculum_subjects").select("id,subject_id,semester_id").in("id", curriculumIds) : Promise.resolve({ data: [] }),
    semesterOfferingIds.length ? supabase.from("semester_offerings").select("id,academic_offering_id").in("id", semesterOfferingIds) : Promise.resolve({ data: [] }),
    supabase.from("syllabi").select("id,course_offering_id"),
  ]);
  const curriculum = (curriculumResult.data ?? []) as CurriculumSubject[];
  const semesterOfferings = (semesterOfferingResult.data ?? []) as SemesterOffering[];
  const curriculumById = new Map(curriculum.map((row) => [row.id, row]));
  const semesterOfferingById = new Map(semesterOfferings.map((row) => [row.id, row]));
  const academicIds = [...new Set(semesterOfferings.map((row) => row.academic_offering_id))];
  const [subjectRows, semesterRows, academicRows] = await Promise.all([
    curriculum.length ? supabase.from("subjects").select("id,name,code").in("id", curriculum.map((r) => r.subject_id)) : Promise.resolve({ data: [] }),
    curriculum.length ? supabase.from("semesters").select("id,name,level_number,career_id").in("id", curriculum.map((r) => r.semester_id)) : Promise.resolve({ data: [] }),
    academicIds.length ? supabase.from("academic_offerings").select("id,period_id,career_id").in("id", academicIds) : Promise.resolve({ data: [] }),
  ]);
  const subjectById = new Map(((subjectRows.data ?? []) as SimpleRow[]).map((row) => [row.id, row]));
  const semesterById = new Map(((semesterRows.data ?? []) as (SimpleRow & { career_id: string })[]).map((row) => [row.id, row]));
  const academicOfferingById = new Map(((academicRows.data ?? []) as AcademicOffering[]).map((row) => [row.id, row]));
  const academicRowsList = (academicRows.data ?? []) as AcademicOffering[];
  const [careerRows, periodRows] = await Promise.all([
    academicRowsList.length ? supabase.from("careers").select("id,name,code").in("id", academicRowsList.map((r) => r.career_id)) : Promise.resolve({ data: [] }),
    academicRowsList.length ? supabase.from("academic_periods").select("id,name,code,status").in("id", academicRowsList.map((r) => r.period_id)) : Promise.resolve({ data: [] }),
  ]);
  const careersById = new Map(((careerRows.data ?? []) as SimpleRow[]).map((row) => [row.id, row]));
  const periodsById = new Map(((periodRows.data ?? []) as SimpleRow[]).map((row) => [row.id, row]));
  const syllabiByCourse = new Map(((syllabiResult.data ?? []) as { id: string; course_offering_id: string }[]).map((row) => [row.course_offering_id, row.id]));

  return (
    <main className="page-content teacher-content">
      <div className="page-heading">
        <div><p className="eyebrow">MI CARGA ACADÉMICA</p><h1><RevealText text={"Hola, " + (profile.full_name?.split(" ")[0] || "docente") + "."} /></h1>
          <p>Estas son las asignaturas que te asignaron para el período. Desde aquí preparas cada documento.</p></div>
        <span className="period-count">{offerings.length} asignaturas</span>
      </div>
      {offerings.length ? (
        <section className="course-grid">
          {offerings.map((offering) => {
            const course = curriculumById.get(offering.curriculum_subject_id);
            const subject = course ? subjectById.get(course.subject_id) : null;
            const semester = course ? semesterById.get(course.semester_id) : null;
            const semesterOffering = semesterOfferingById.get(offering.semester_offering_id);
            const academic = semesterOffering ? academicOfferingById.get(semesterOffering.academic_offering_id) : null;
            const career = academic ? careersById.get(academic.career_id) : null;
            const period = academic ? periodsById.get(academic.period_id) : null;
            const syllabusId = syllabiByCourse.get(offering.id);
            return <SpotlightCard className="course-card" key={offering.id}>
              <div className="course-card-head"><span className="course-icon">▦</span><span className={"status-pill " + (offering.is_enabled && period?.status === "abierto" ? "status-open" : "status-cerrado")}>{period?.name ?? "Período asignado"}</span></div>
              <p className="course-code">{subject?.code ?? "ASIGNATURA"} · {offering.parallel}</p>
              <h2>{subject?.name ?? "Asignatura asignada"}</h2>
              <p className="course-meta">{career?.name ?? "Carrera"} <span>·</span> {semester?.name ?? "Semestre"} <span>·</span> {offering.modality}</p>
              <div className="course-documents">
                {syllabusId ? <Link className="document-row" href={"/docente/silabo/" + syllabusId}><span className="document-icon">▤</span><span><strong>Sílabo y Anexo 1</strong><small>Matriz de 16 semanas</small></span><b>→</b></Link> :
                  <form action={createSyllabusAction}><input type="hidden" name="course_offering_id" value={offering.id} /><button className="document-row document-button" type="submit"><span className="document-icon">＋</span><span><strong>Crear sílabo</strong><small>Empieza con los datos de la oferta</small></span><b>→</b></button></form>}
              </div>
              <div className="course-footer"><span className="tiny-label">OFERTA · {period?.code ?? "PERÍODO"}</span><span>{offering.is_enabled && period?.status === "abierto" ? "Edición habilitada" : "Consulta"}</span></div>
            </SpotlightCard>;
          })}
        </section>
      ) : (
        <section className="surface-card teacher-empty"><div className="empty-illustration">▦</div><span className="tiny-label">SIN ASIGNATURAS ASIGNADAS</span><h2>Tu espacio está listo.</h2>
          <p>Cuando el administrador habilite la oferta académica y te asigne una asignatura, aparecerá aquí el acceso al sílabo y los planes de clase.</p></section>
      )}
      <div className="teacher-tip"><span>✦</span><p><strong>Un flujo, tres pasos:</strong> completa el sílabo, organiza las 16 semanas en el Anexo 1 y crea cada plan de clase desde sus temas.</p></div>
    </main>
  );
}
