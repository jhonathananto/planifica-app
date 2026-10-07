import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SyllabusWorkbook from "@/components/syllabus-workbook";
import SyllabusMultiStepForm from "@/components/syllabus-multistep-form";
import { mergeWithDefaults } from "@/lib/syllabus/sections";

type Props = { params: Promise<{ id: string }> };

export default async function SyllabusContentPage({ params }: Props) {
  const profile = await requireTeacher();
  const { id } = await params;
  const supabase = await createClient();
  const { data: syllabus } = await supabase.from("syllabi")
    .select("id,course_offering_id,content,status,workbook_snapshot")
    .eq("id", id).maybeSingle();
  if (!syllabus) notFound();

  // Cadena oferta -> carrera / asignatura / semestre / período para prellenar I y XII.
  const { data: offering } = await supabase.from("course_offerings")
    .select("parallel,modality,curriculum_subject_id,semester_offering_id")
    .eq("id", syllabus.course_offering_id).maybeSingle();
  const { data: curriculum } = offering ? await supabase.from("curriculum_subjects")
    .select("subject_id,semester_id,default_hours").eq("id", offering.curriculum_subject_id).maybeSingle() : { data: null };
  const [{ data: subject }, { data: semester }, { data: semesterOffering }] = await Promise.all([
    curriculum ? supabase.from("subjects").select("name,code").eq("id", curriculum.subject_id).maybeSingle() : Promise.resolve({ data: null }),
    curriculum ? supabase.from("semesters").select("name,level_number,career_id").eq("id", curriculum.semester_id).maybeSingle() : Promise.resolve({ data: null }),
    offering ? supabase.from("semester_offerings").select("academic_offering_id").eq("id", offering.semester_offering_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const [{ data: career }, { data: academicOffering }] = await Promise.all([
    semester ? supabase.from("careers").select("name,code").eq("id", (semester as { career_id: string }).career_id).maybeSingle() : Promise.resolve({ data: null }),
    semesterOffering ? supabase.from("academic_offerings").select("period_id,career_id").eq("id", (semesterOffering as { academic_offering_id: string }).academic_offering_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const { data: period } = academicOffering
    ? await supabase.from("academic_periods").select("name,starts_on,ends_on,teaching_weeks").eq("id", (academicOffering as { period_id: string }).period_id).maybeSingle()
    : { data: null };

  const merged = mergeWithDefaults((syllabus.content ?? {}) as Record<string, unknown>);

  // Prellenar I. DATOS INFORMATIVOS y XII. ANEXO 1 con la oferta (sin pisar lo ya escrito).
  const di = merged.datos_informativos as Record<string, unknown>;
  const ax = merged.anexo1 as Record<string, unknown>;
  const fill = (obj: Record<string, unknown>, key: string, value: unknown) => {
    if ((obj[key] ?? "") === "" && value) obj[key] = value;
  };
  fill(di, "carrera", (career as { name?: string } | null)?.name ?? "");
  fill(di, "codigo_carrera", (career as { code?: string } | null)?.code ?? "");
  fill(di, "nombre_asignatura", (subject as { name?: string } | null)?.name ?? "");
  fill(di, "codigo_asignatura", (subject as { code?: string } | null)?.code ?? "");
  fill(di, "semestre", (semester as { name?: string } | null)?.name ?? "");
  fill(di, "paralelo", (offering as { parallel?: string } | null)?.parallel ?? "");
  fill(di, "periodo_academico", (period as { name?: string } | null)?.name ?? "");
  fill(di, "modalidad", (offering as { modality?: string } | null)?.modality ?? "Presencial");
  fill(di, "docente_responsable", profile.full_name ?? "");
  fill(ax, "carrera", di.carrera);
  fill(ax, "codigo_carrera", di.codigo_carrera);
  fill(ax, "nombre_asignatura", di.nombre_asignatura);
  fill(ax, "codigo_asignatura", di.codigo_asignatura);
  fill(ax, "nivel_estudios", di.semestre);
  fill(ax, "modalidad", di.modalidad);
  fill(ax, "prerequisito", di.prerequisito);
  fill(ax, "corequisito", di.corequisito);

  return (
    <main className="page-content teacher-content syllabus-content">
      <div className="breadcrumbs page-breadcrumbs"><Link href={"/docente/silabo/" + id}>Sílabo</Link><span>/</span>Contenido</div>
      <div className="page-heading compact-heading">
        <div>
          <p className="eyebrow">SÍLABO · {String(di.nombre_asignatura || (subject as { name?: string } | null)?.name || "Asignatura")} · 12 SECCIONES</p>
          <h1>Completa el sílabo paso a paso</h1>
          <p>Cada cambio se guarda automáticamente en la base de datos. Puedes saltar entre secciones libremente.</p>
        </div>
        <span className={"status-pill status-" + (syllabus.status === "aprobado" ? "open" : "draft")}>
          {syllabus.status === "aprobado" ? "Aprobado" : "Borrador"}
        </span>
      </div>

      <SyllabusMultiStepForm syllabusId={id} initialContent={merged}>
        <SyllabusWorkbook syllabusId={id} initialSnapshot={(syllabus.workbook_snapshot ?? {}) as Record<string, unknown>} />
      </SyllabusMultiStepForm>

      <div className="plan-submit-row">
        <Link className="button button-outline" href={"/docente/silabo/" + id}>Volver al sílabo</Link>
      </div>
    </main>
  );
}
