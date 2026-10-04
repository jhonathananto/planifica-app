import { createClient } from "@/lib/supabase/server";
import { addSubjectToSemesterAction, createCareerAction, createSemesterAction, createSubjectAction } from "./actions";

type Props = { searchParams: Promise<{ error?: string; guardado?: string }> };
type Career = { id: string; code: string; name: string; degree_level: string | null };
type Semester = { id: string; career_id: string; level_number: number; name: string };
type Subject = { id: string; code: string; name: string };
type CurriculumSubject = { id: string; semester_id: string; subject_id: string; default_hours: Record<string, number> };

const errors: Record<string, string> = {
  carrera: "No se pudo crear la carrera. Revisa que el código no esté repetido.",
  semestre: "No se pudo crear el semestre. El nivel debe ser único dentro de su carrera.",
  asignatura: "No se pudo crear la asignatura. Revisa el código.",
  curriculo: "No se pudo vincular la asignatura. Verifica si ya existe en ese semestre.",
};

export default async function StructurePage({ searchParams }: Props) {
  const query = await searchParams;
  const supabase = await createClient();
  const [careerResult, semesterResult, subjectResult, curriculumResult] = await Promise.all([
    supabase.from("careers").select("id,code,name,degree_level").order("name"),
    supabase.from("semesters").select("id,career_id,level_number,name").order("level_number"),
    supabase.from("subjects").select("id,code,name").order("name"),
    supabase.from("curriculum_subjects").select("id,semester_id,subject_id,default_hours"),
  ]);
  const careers = (careerResult.data ?? []) as Career[];
  const semesters = (semesterResult.data ?? []) as Semester[];
  const subjects = (subjectResult.data ?? []) as Subject[];
  const curriculum = (curriculumResult.data ?? []) as CurriculumSubject[];
  const careerById = new Map(careers.map((row) => [row.id, row]));
  const subjectById = new Map(subjects.map((row) => [row.id, row]));
  const curriculumBySemester = new Map<string, Subject[]>();
  for (const row of curriculum) {
    const subject = subjectById.get(row.subject_id);
    if (!subject) continue;
    curriculumBySemester.set(row.semester_id, [...(curriculumBySemester.get(row.semester_id) ?? []), subject]);
  }

  return (
    <main className="page-content">
      <div className="page-heading compact-heading"><div><p className="eyebrow">CATÁLOGOS · ESTRUCTURA CURRICULAR</p>
        <h1>Carreras, semestres y asignaturas</h1><p>Define la estructura que luego se habilita dentro de cada período académico.</p></div></div>
      {query.error && <div className="form-error" role="alert">{errors[query.error] ?? "Revisa los datos ingresados."}</div>}
      {query.guardado && <div className="form-success">Cambios guardados.</div>}

      <div className="catalog-cards">
        <section className="surface-card catalog-card">
          <span className="tiny-label">01 · CARRERAS</span><h2>Catálogo de carreras</h2>
          <form action={createCareerAction} className="stack-form">
            <label>Código<input name="code" placeholder="2020-560612B01-P-0701" required /></label>
            <label>Nombre<input name="name" placeholder="Infraestructura de Redes y Ciberseguridad" required /></label>
            <label>Nivel académico<input name="degree_level" placeholder="Tecnológico Superior Universitario" /></label>
            <button className="button button-primary button-full" type="submit">Agregar carrera</button>
          </form>
          <div className="catalog-list">{careers.map((career) => <div className="catalog-row" key={career.id}><strong>{career.name}</strong><small>{career.code}</small></div>)}
            {!careers.length && <p className="catalog-empty">Todavía no hay carreras en el catálogo.</p>}</div>
        </section>

        <section className="surface-card catalog-card">
          <span className="tiny-label">02 · NIVELES</span><h2>Semestres por carrera</h2>
          <form action={createSemesterAction} className="stack-form">
            <label>Carrera<select name="career_id" required defaultValue=""><option value="" disabled>Selecciona una carrera</option>{careers.map((career) => <option value={career.id} key={career.id}>{career.name}</option>)}</select></label>
            <div className="form-pair"><label>N.º de nivel<input name="level_number" type="number" min="1" max="20" required placeholder="1" /></label><label>Nombre<input name="name" required placeholder="Primero" /></label></div>
            <button className="button button-primary button-full" type="submit" disabled={!careers.length}>Agregar semestre</button>
          </form>
          <div className="catalog-list">{semesters.map((semester) => <div className="catalog-row" key={semester.id}><strong>{careerById.get(semester.career_id)?.name ?? "Carrera"} · {semester.name}</strong><small>Nivel {semester.level_number} · {(curriculumBySemester.get(semester.id) ?? []).length} asignaturas</small></div>)}
            {!semesters.length && <p className="catalog-empty">Crea primero una carrera y luego sus niveles.</p>}</div>
        </section>

        <section className="surface-card catalog-card">
          <span className="tiny-label">03 · ASIGNATURAS</span><h2>Catálogo de asignaturas</h2>
          <form action={createSubjectAction} className="stack-form">
            <label>Código<input name="code" placeholder="IRCS-105" required /></label>
            <label>Nombre<input name="name" placeholder="Fundamentos de Redes de Datos" required /></label>
            <label>Descripción<input name="description" placeholder="Opcional" /></label>
            <button className="button button-primary button-full" type="submit">Agregar asignatura</button>
          </form>
          <div className="catalog-list">{subjects.map((subject) => <div className="catalog-row" key={subject.id}><strong>{subject.name}</strong><small>{subject.code}</small></div>)}
            {!subjects.length && <p className="catalog-empty">Agrega las asignaturas al catálogo.</p>}</div>
        </section>

        <section className="surface-card catalog-card">
          <span className="tiny-label">04 · CURRÍCULO</span><h2>Vincular al semestre</h2>
          <form action={addSubjectToSemesterAction} className="stack-form">
            <label>Semestre<select name="semester_id" required defaultValue=""><option value="" disabled>Selecciona nivel</option>{semesters.map((semester) => <option value={semester.id} key={semester.id}>{careerById.get(semester.career_id)?.name} · {semester.name}</option>)}</select></label>
            <label>Asignatura<select name="subject_id" required defaultValue=""><option value="" disabled>Selecciona asignatura</option>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.code} · {subject.name}</option>)}</select></label>
            <label>Horas totales previstas<input name="total_hours" type="number" min="0" placeholder="192" /></label>
            <label>Prerrequisitos<select name="prerequisites" multiple size={Math.min(Math.max(subjects.length, 2), 5)}>{subjects.map((subject) => <option value={subject.name} key={subject.id}>{subject.name}</option>)}</select></label>
            <label>Correquisitos<select name="corequisites" multiple size={Math.min(Math.max(subjects.length, 2), 5)}>{subjects.map((subject) => <option value={subject.name} key={subject.id}>{subject.name}</option>)}</select></label>
            <button className="button button-primary button-full" type="submit" disabled={!semesters.length || !subjects.length}>Vincular asignatura</button>
          </form>
          <p className="field-help">Usa Ctrl o Cmd para elegir más de un prerrequisito o correquisito.</p>
        </section>
      </div>
    </main>
  );
}

