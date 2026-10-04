-- Planificación Docente: academic model with database-level access controls.
-- Execute through Supabase SQL Editor or Supabase migrations.

create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'docente' check (role in ('admin', 'docente')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.careers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  degree_level text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.semesters (
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references public.careers(id) on delete restrict,
  level_number smallint not null check (level_number between 1 and 20),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (career_id, level_number),
  unique (id, career_id)
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.curriculum_subjects (
  id uuid primary key default gen_random_uuid(),
  semester_id uuid not null references public.semesters(id) on delete restrict,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  prerequisites text[] not null default '{}',
  corequisites text[] not null default '{}',
  default_hours jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (semester_id, subject_id),
  unique (id, semester_id)
);

create table public.academic_periods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  teaching_weeks smallint not null default 16 check (teaching_weeks between 1 and 52),
  status text not null default 'borrador' check (status in ('borrador', 'abierto', 'cerrado')),
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_on <= ends_on)
);

create table public.academic_calendar_events (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.academic_periods(id) on delete cascade,
  label text not null,
  event_type text not null default 'institucional',
  starts_on date not null,
  ends_on date not null,
  is_teaching_day boolean not null default false,
  details text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_on <= ends_on)
);

-- Period -> career offering -> semester offering -> course offering with assigned teacher.
create table public.academic_offerings (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.academic_periods(id) on delete restrict,
  career_id uuid not null references public.careers(id) on delete restrict,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_id, career_id),
  unique (id, career_id)
);

create table public.semester_offerings (
  id uuid primary key default gen_random_uuid(),
  academic_offering_id uuid not null,
  career_id uuid not null,
  semester_id uuid not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (academic_offering_id, career_id)
    references public.academic_offerings(id, career_id) on delete cascade,
  foreign key (semester_id, career_id)
    references public.semesters(id, career_id) on delete restrict,
  unique (academic_offering_id, semester_id),
  unique (id, semester_id)
);

create table public.course_offerings (
  id uuid primary key default gen_random_uuid(),
  semester_offering_id uuid not null,
  semester_id uuid not null,
  curriculum_subject_id uuid not null,
  teacher_id uuid not null references public.profiles(user_id) on delete restrict,
  parallel text not null default 'A',
  modality text not null default 'Presencial',
  meeting_schedule jsonb not null default '[]'::jsonb,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (semester_offering_id, semester_id)
    references public.semester_offerings(id, semester_id) on delete cascade,
  foreign key (curriculum_subject_id, semester_id)
    references public.curriculum_subjects(id, semester_id) on delete restrict,
  unique (semester_offering_id, curriculum_subject_id, parallel),
  unique (id, teacher_id)
);

create index course_offerings_teacher_idx on public.course_offerings(teacher_id);
create index academic_offerings_period_idx on public.academic_offerings(period_id);
create index academic_calendar_events_range_idx on public.academic_calendar_events(period_id, starts_on, ends_on);

create table public.catalog_options (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  value text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  unique (category, value)
);

create table public.syllabi (
  id uuid primary key default gen_random_uuid(),
  course_offering_id uuid not null unique references public.course_offerings(id) on delete cascade,
  status text not null default 'borrador'
    check (status in ('borrador', 'en_revision', 'aprobado', 'archivado')),
  content jsonb not null default '{}'::jsonb,
  workbook_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Full editable workbook is the source; these activity rows are its date lookup projection.
create table public.syllabus_sessions (
  id uuid primary key default gen_random_uuid(),
  syllabus_id uuid not null references public.syllabi(id) on delete cascade,
  row_order integer not null,
  week_number smallint check (week_number between 1 and 52),
  planned_date date,
  activity_number integer,
  unit_title text,
  topic text not null default '',
  teaching_form text,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  location text,
  autonomous_experiment text,
  independent_work text,
  teaching_aids text,
  additional_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (syllabus_id, row_order),
  unique (id, syllabus_id)
);

create index syllabus_sessions_date_idx on public.syllabus_sessions(syllabus_id, planned_date);
create index syllabus_sessions_week_idx on public.syllabus_sessions(syllabus_id, week_number);

create table public.class_plans (
  id uuid primary key default gen_random_uuid(),
  syllabus_id uuid not null references public.syllabi(id) on delete cascade,
  plan_number integer not null check (plan_number > 0),
  class_date date not null,
  duration_minutes integer not null check (duration_minutes > 0),
  status text not null default 'borrador' check (status in ('borrador', 'finalizado')),
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (syllabus_id, plan_number),
  unique (id, syllabus_id)
);

-- One plan can draw one or several sessions from the syllabus sheet.
create table public.class_plan_sessions (
  id uuid primary key default gen_random_uuid(),
  class_plan_id uuid not null,
  syllabus_id uuid not null,
  syllabus_session_id uuid references public.syllabus_sessions(id) on delete set null,
  source_activity jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (class_plan_id, syllabus_id)
    references public.class_plans(id, syllabus_id) on delete cascade,
  unique (class_plan_id, syllabus_session_id),
  unique (class_plan_id, sort_order)
);

create table public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  syllabus_id uuid not null references public.syllabi(id) on delete cascade,
  class_plan_id uuid,
  document_type text not null check (document_type in ('silabo', 'plan_de_clase')),
  storage_path text not null unique,
  file_name text not null,
  created_by uuid not null references public.profiles(user_id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (class_plan_id, syllabus_id)
    references public.class_plans(id, syllabus_id) on delete cascade,
  check ((document_type = 'silabo' and class_plan_id is null) or
         (document_type = 'plan_de_clase' and class_plan_id is not null))
);

create index generated_documents_syllabus_idx on public.generated_documents(syllabus_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'careers', 'semesters', 'subjects', 'curriculum_subjects',
    'academic_periods', 'academic_calendar_events', 'academic_offerings',
    'semester_offerings', 'course_offerings', 'syllabi', 'syllabus_sessions', 'class_plans'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      table_name || '_set_updated_at', table_name
    );
  end loop;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  )
  on conflict (user_id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.role = 'admin' and p.is_active
  );
$$;

create or replace function public.can_access_course_offering(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.course_offerings co
    join public.semester_offerings so on so.id = co.semester_offering_id
    join public.academic_offerings ao on ao.id = so.academic_offering_id
    join public.profiles p on p.user_id = (select auth.uid()) and p.is_active
    where co.id = target_id and (p.role = 'admin' or co.teacher_id = p.user_id)
  );
$$;

create or replace function public.can_access_academic_offering(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_admin() or exists (
    select 1
    from public.semester_offerings so
    join public.course_offerings co on co.semester_offering_id = so.id
    where so.academic_offering_id = target_id and public.can_access_course_offering(co.id)
  );
$$;

create or replace function public.can_edit_course_offering(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_admin() or exists (
    select 1
    from public.course_offerings co
    join public.semester_offerings so on so.id = co.semester_offering_id
    join public.academic_offerings ao on ao.id = so.academic_offering_id
    join public.academic_periods ap on ap.id = ao.period_id
    join public.profiles p on p.user_id = (select auth.uid()) and p.is_active
    where co.id = target_id and co.teacher_id = p.user_id and co.is_enabled
      and so.is_enabled and ao.is_enabled and ap.status = 'abierto'
  );
$$;

create or replace function public.can_access_period(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_admin() or exists (
    select 1
    from public.academic_offerings ao
    join public.semester_offerings so on so.academic_offering_id = ao.id
    join public.course_offerings co on co.semester_offering_id = so.id
    join public.profiles p on p.user_id = (select auth.uid()) and p.is_active
    where ao.period_id = target_id and public.can_access_course_offering(co.id)
  );
$$;

create or replace function public.can_access_career(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_admin() or exists (
    select 1
    from public.academic_offerings ao
    join public.semester_offerings so on so.academic_offering_id = ao.id
    join public.course_offerings co on co.semester_offering_id = so.id
    join public.profiles p on p.user_id = (select auth.uid()) and p.is_active
    where ao.career_id = target_id and public.can_access_course_offering(co.id)
  );
$$;

create or replace function public.can_access_semester(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_admin() or exists (
    select 1
    from public.semester_offerings so
    join public.course_offerings co on co.semester_offering_id = so.id
    join public.profiles p on p.user_id = (select auth.uid()) and p.is_active
    where so.semester_id = target_id and public.can_access_course_offering(co.id)
  );
$$;

create or replace function public.can_access_subject(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_admin() or exists (
    select 1
    from public.curriculum_subjects cs
    join public.course_offerings co on co.curriculum_subject_id = cs.id
    join public.profiles p on p.user_id = (select auth.uid()) and p.is_active
    where cs.subject_id = target_id and public.can_access_course_offering(co.id)
  );
$$;

create or replace function public.can_access_syllabus(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_admin() or exists (
    select 1
    from public.syllabi s
    join public.course_offerings co on co.id = s.course_offering_id
    join public.profiles p on p.user_id = (select auth.uid()) and p.is_active
    where s.id = target_id and public.can_access_course_offering(co.id)
  );
$$;

create or replace function public.can_edit_syllabus(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_admin() or exists (
    select 1
    from public.syllabi s
    join public.course_offerings co on co.id = s.course_offering_id
    join public.semester_offerings so on so.id = co.semester_offering_id
    join public.academic_offerings ao on ao.id = so.academic_offering_id
    join public.academic_periods ap on ap.id = ao.period_id
    join public.profiles p on p.user_id = (select auth.uid()) and p.is_active
    where s.id = target_id and public.can_edit_course_offering(co.id) and ap.status = 'abierto'
  );
$$;

create or replace function public.validate_class_plan_session()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.syllabus_session_id is not null and not exists (
    select 1 from public.syllabus_sessions ss
    where ss.id = new.syllabus_session_id and ss.syllabus_id = new.syllabus_id
  ) then
    raise exception 'La actividad seleccionada no pertenece al sílabo del plan';
  end if;
  return new;
end;
$$;

create trigger validate_class_plan_session_before_write
  before insert or update on public.class_plan_sessions
  for each row execute function public.validate_class_plan_session();

create or replace function public.can_access_offering_folder(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  folder_name text;
begin
  folder_name := (storage.foldername(object_name))[1];
  if folder_name is null or folder_name !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.can_access_course_offering(folder_name::uuid);
end;
$$;

create or replace function public.can_edit_offering_folder(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  folder_name text;
begin
  folder_name := (storage.foldername(object_name))[1];
  if folder_name is null or folder_name !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.can_edit_course_offering(folder_name::uuid);
end;
$$;

alter table public.profiles enable row level security;
alter table public.careers enable row level security;
alter table public.semesters enable row level security;
alter table public.subjects enable row level security;
alter table public.curriculum_subjects enable row level security;
alter table public.academic_periods enable row level security;
alter table public.academic_calendar_events enable row level security;
alter table public.academic_offerings enable row level security;
alter table public.semester_offerings enable row level security;
alter table public.course_offerings enable row level security;
alter table public.catalog_options enable row level security;
alter table public.syllabi enable row level security;
alter table public.syllabus_sessions enable row level security;
alter table public.class_plans enable row level security;
alter table public.class_plan_sessions enable row level security;
alter table public.generated_documents enable row level security;

create policy "profile self or admin read" on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_active_admin());
create policy "admin manage profiles" on public.profiles
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "user edit own profile name" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()) and is_active)
  with check (user_id = (select auth.uid()) and is_active);

create policy "admin manage careers" on public.careers
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "assigned teachers read careers" on public.careers
  for select to authenticated using (public.can_access_career(id));

create policy "admin manage semesters" on public.semesters
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "assigned teachers read semesters" on public.semesters
  for select to authenticated using (public.can_access_semester(id));

create policy "admin manage subjects" on public.subjects
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "assigned teachers read subjects" on public.subjects
  for select to authenticated using (public.can_access_subject(id));

create policy "admin manage curriculum subjects" on public.curriculum_subjects
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "assigned teachers read curriculum subjects" on public.curriculum_subjects
  for select to authenticated using (public.can_access_semester(semester_id));

create policy "admin manage academic periods" on public.academic_periods
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "assigned teachers read periods" on public.academic_periods
  for select to authenticated using (public.can_access_period(id));

create policy "admin manage calendar events" on public.academic_calendar_events
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "assigned teachers read calendar" on public.academic_calendar_events
  for select to authenticated using (public.can_access_period(period_id));

create policy "admin manage career offerings" on public.academic_offerings
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "assigned teachers read career offerings" on public.academic_offerings
  for select to authenticated
  using (public.can_access_academic_offering(id));

create policy "admin manage semester offerings" on public.semester_offerings
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "assigned teachers read semester offerings" on public.semester_offerings
  for select to authenticated using (exists (
    select 1 from public.course_offerings co
    where co.semester_offering_id = semester_offerings.id
      and public.can_access_course_offering(co.id)
  ));

create policy "admin manage course offerings" on public.course_offerings
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "teachers read assigned courses" on public.course_offerings
  for select to authenticated using (public.can_access_course_offering(id));

create policy "admin manage catalog options" on public.catalog_options
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "active catalog options are selectable" on public.catalog_options
  for select to authenticated using (is_active);

create policy "admin manage syllabi" on public.syllabi
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "teachers read assigned syllabi" on public.syllabi
  for select to authenticated using (public.can_access_course_offering(course_offering_id));
create policy "teachers create syllabus for assigned course" on public.syllabi
  for insert to authenticated with check (public.can_edit_course_offering(course_offering_id));
create policy "teachers update assigned syllabus" on public.syllabi
  for update to authenticated
  using (public.can_edit_course_offering(course_offering_id))
  with check (public.can_edit_course_offering(course_offering_id));

create policy "admin manage syllabus sessions" on public.syllabus_sessions
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "teachers read own syllabus sessions" on public.syllabus_sessions
  for select to authenticated using (public.can_access_syllabus(syllabus_id));
create policy "teachers add own syllabus sessions" on public.syllabus_sessions
  for insert to authenticated with check (public.can_edit_syllabus(syllabus_id));
create policy "teachers update own syllabus sessions" on public.syllabus_sessions
  for update to authenticated using (public.can_edit_syllabus(syllabus_id))
  with check (public.can_edit_syllabus(syllabus_id));
create policy "teachers delete own syllabus sessions" on public.syllabus_sessions
  for delete to authenticated using (public.can_edit_syllabus(syllabus_id));

create policy "admin manage class plans" on public.class_plans
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "teachers read own class plans" on public.class_plans
  for select to authenticated using (public.can_access_syllabus(syllabus_id));
create policy "teachers create own class plans" on public.class_plans
  for insert to authenticated with check (public.can_edit_syllabus(syllabus_id));
create policy "teachers update own class plans" on public.class_plans
  for update to authenticated using (public.can_edit_syllabus(syllabus_id))
  with check (public.can_edit_syllabus(syllabus_id));
create policy "teachers delete own class plans" on public.class_plans
  for delete to authenticated using (public.can_edit_syllabus(syllabus_id));

create policy "admin manage plan session links" on public.class_plan_sessions
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "teachers read own plan session links" on public.class_plan_sessions
  for select to authenticated using (public.can_access_syllabus(syllabus_id));
create policy "teachers add own plan session links" on public.class_plan_sessions
  for insert to authenticated with check (public.can_edit_syllabus(syllabus_id));
create policy "teachers delete own plan session links" on public.class_plan_sessions
  for delete to authenticated using (public.can_edit_syllabus(syllabus_id));

create policy "admin manage generated documents" on public.generated_documents
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "teachers read own generated documents" on public.generated_documents
  for select to authenticated using (public.can_access_syllabus(syllabus_id));
create policy "teachers create own generated documents" on public.generated_documents
  for insert to authenticated with check (
    created_by = (select auth.uid()) and public.can_edit_syllabus(syllabus_id)
  );
create policy "teachers delete own generated documents" on public.generated_documents
  for delete to authenticated using (public.can_edit_syllabus(syllabus_id));

create or replace function public.create_class_plan(
  target_syllabus_id uuid,
  target_class_date date,
  target_duration_minutes integer,
  plan_content jsonb,
  selected_session_ids uuid[] default '{}'
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  next_plan_number integer;
  created_plan_id uuid;
  selected_count integer := 0;
  session_row record;
begin
  if not public.can_edit_syllabus(target_syllabus_id) then
    raise exception 'No tiene permiso para crear un plan en este sílabo';
  end if;
  if target_duration_minutes <= 0 or jsonb_typeof(plan_content) <> 'object' then
    raise exception 'Duración o contenido del plan no válido';
  end if;
  if selected_session_ids is null then selected_session_ids := '{}'; end if;

  if not exists (
    select 1
    from public.syllabi s
    join public.course_offerings co on co.id = s.course_offering_id
    join public.semester_offerings so on so.id = co.semester_offering_id
    join public.academic_offerings ao on ao.id = so.academic_offering_id
    join public.academic_periods ap on ap.id = ao.period_id
    where s.id = target_syllabus_id
      and target_class_date between ap.starts_on and ap.ends_on
  ) then
    raise exception 'La fecha debe estar dentro del período académico';
  end if;
  if exists (
    select 1 from public.syllabi s
    join public.course_offerings co on co.id = s.course_offering_id
    join public.semester_offerings so on so.id = co.semester_offering_id
    join public.academic_offerings ao on ao.id = so.academic_offering_id
    join public.academic_calendar_events e on e.period_id = ao.period_id
    where s.id = target_syllabus_id
      and target_class_date between e.starts_on and e.ends_on
      and e.event_type = 'feriado' and not e.is_teaching_day
  ) then
    raise exception 'La fecha coincide con un feriado sin jornada académica habilitada';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_syllabus_id::text, 0));
  select coalesce(max(cp.plan_number), 0) + 1 into next_plan_number
  from public.class_plans cp where cp.syllabus_id = target_syllabus_id;

  insert into public.class_plans (syllabus_id, plan_number, class_date, duration_minutes, content)
  values (target_syllabus_id, next_plan_number, target_class_date, target_duration_minutes, plan_content)
  returning id into created_plan_id;

  for session_row in
    select ss.*
    from public.syllabus_sessions ss
    where ss.syllabus_id = target_syllabus_id and ss.id = any(selected_session_ids)
    order by array_position(selected_session_ids, ss.id)
  loop
    insert into public.class_plan_sessions (
      class_plan_id, syllabus_id, syllabus_session_id, source_activity, sort_order
    ) values (
      created_plan_id,
      target_syllabus_id,
      session_row.id,
      jsonb_build_object(
        'week_number', session_row.week_number,
        'planned_date', session_row.planned_date,
        'activity_number', session_row.activity_number,
        'unit_title', session_row.unit_title,
        'topic', session_row.topic,
        'teaching_form', session_row.teaching_form,
        'duration_minutes', session_row.duration_minutes,
        'location', session_row.location,
        'autonomous_experiment', session_row.autonomous_experiment,
        'independent_work', session_row.independent_work,
        'teaching_aids', session_row.teaching_aids
      ),
      selected_count
    );
    selected_count := selected_count + 1;
  end loop;

  if selected_count <> cardinality(selected_session_ids) then
    raise exception 'Una o más actividades no pertenecen a este sílabo';
  end if;
  return created_plan_id;
end;
$$;

-- Save the flexible Univer workbook and its queryable activity projection atomically.
create or replace function public.save_syllabus_workbook(
  target_syllabus_id uuid,
  workbook_data jsonb,
  activity_rows jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if jsonb_typeof(workbook_data) <> 'object' or jsonb_typeof(activity_rows) <> 'array' then
    raise exception 'Formato de matriz no válido';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(activity_rows) as row_data(week_number smallint, planned_date date)
    join public.syllabi s on s.id = target_syllabus_id
    join public.course_offerings co on co.id = s.course_offering_id
    join public.semester_offerings so on so.id = co.semester_offering_id
    join public.academic_offerings ao on ao.id = so.academic_offering_id
    join public.academic_periods ap on ap.id = ao.period_id
    where (row_data.week_number is not null and row_data.week_number > ap.teaching_weeks)
      or (row_data.planned_date is not null and row_data.planned_date not between ap.starts_on and ap.ends_on)
      or (row_data.planned_date is not null and exists (
        select 1 from public.academic_calendar_events e
        where e.period_id = ap.id
          and row_data.planned_date between e.starts_on and e.ends_on
          and e.event_type = 'feriado' and not e.is_teaching_day
      ))
  ) then
    raise exception 'Revisa las semanas y fechas: deben pertenecer al período y evitar feriados sin jornada académica';
  end if;

  update public.syllabi
  set workbook_snapshot = workbook_data
  where id = target_syllabus_id and public.can_edit_syllabus(id);

  if not found then
    raise exception 'No tiene permiso para editar este sílabo o el período está cerrado';
  end if;

  delete from public.syllabus_sessions where syllabus_id = target_syllabus_id;

  insert into public.syllabus_sessions (
    syllabus_id, row_order, week_number, planned_date, activity_number, unit_title,
    topic, teaching_form, duration_minutes, location, autonomous_experiment,
    independent_work, teaching_aids, additional_data
  )
  select
    target_syllabus_id, row_data.row_order, row_data.week_number, row_data.planned_date,
    row_data.activity_number, row_data.unit_title, coalesce(row_data.topic, ''),
    row_data.teaching_form, row_data.duration_minutes, row_data.location,
    row_data.autonomous_experiment, row_data.independent_work, row_data.teaching_aids,
    coalesce(row_data.additional_data, '{}'::jsonb)
  from jsonb_to_recordset(activity_rows) as row_data(
    row_order integer,
    week_number smallint,
    planned_date date,
    activity_number integer,
    unit_title text,
    topic text,
    teaching_form text,
    duration_minutes integer,
    location text,
    autonomous_experiment text,
    independent_work text,
    teaching_aids text,
    additional_data jsonb
  )
  where row_data.row_order is not null
    and (nullif(btrim(coalesce(row_data.topic, '')), '') is not null or row_data.week_number is not null);
end;
$$;

-- Grants and RLS both matter: the public API receives only authenticated access.
revoke all on public.profiles, public.careers, public.semesters, public.subjects,
  public.curriculum_subjects, public.academic_periods, public.academic_calendar_events,
  public.academic_offerings, public.semester_offerings, public.course_offerings,
  public.catalog_options, public.syllabi, public.syllabus_sessions, public.class_plans,
  public.class_plan_sessions, public.generated_documents from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant select, insert, update, delete on
  public.careers, public.semesters, public.subjects, public.curriculum_subjects,
  public.academic_periods, public.academic_calendar_events, public.academic_offerings,
  public.semester_offerings, public.course_offerings, public.catalog_options,
  public.syllabi, public.syllabus_sessions, public.class_plans,
  public.class_plan_sessions, public.generated_documents
to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.is_active_admin() from public, anon;
revoke all on function public.can_access_course_offering(uuid) from public, anon;
revoke all on function public.can_access_academic_offering(uuid) from public, anon;
revoke all on function public.can_edit_course_offering(uuid) from public, anon;
revoke all on function public.can_access_period(uuid) from public, anon;
revoke all on function public.can_access_career(uuid) from public, anon;
revoke all on function public.can_access_semester(uuid) from public, anon;
revoke all on function public.can_access_subject(uuid) from public, anon;
revoke all on function public.can_access_syllabus(uuid) from public, anon;
revoke all on function public.can_edit_syllabus(uuid) from public, anon;
revoke all on function public.save_syllabus_workbook(uuid, jsonb, jsonb) from public, anon;
revoke all on function public.create_class_plan(uuid, date, integer, jsonb, uuid[]) from public, anon;
revoke all on function public.validate_class_plan_session() from public, anon, authenticated;
revoke all on function public.can_access_offering_folder(text) from public, anon;
revoke all on function public.can_edit_offering_folder(text) from public, anon;
grant execute on function public.is_active_admin() to authenticated;
grant execute on function public.can_access_course_offering(uuid) to authenticated;
grant execute on function public.can_access_academic_offering(uuid) to authenticated;
grant execute on function public.can_edit_course_offering(uuid) to authenticated;
grant execute on function public.can_access_period(uuid) to authenticated;
grant execute on function public.can_access_career(uuid) to authenticated;
grant execute on function public.can_access_semester(uuid) to authenticated;
grant execute on function public.can_access_subject(uuid) to authenticated;
grant execute on function public.can_access_syllabus(uuid) to authenticated;
grant execute on function public.can_edit_syllabus(uuid) to authenticated;
grant execute on function public.save_syllabus_workbook(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.create_class_plan(uuid, date, integer, jsonb, uuid[]) to authenticated;
grant execute on function public.can_access_offering_folder(text) to authenticated, service_role;
grant execute on function public.can_edit_offering_folder(text) to authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'academic-documents',
  'academic-documents',
  false,
  26214400,
  array[
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "assigned users read academic files" on storage.objects
  for select to authenticated
  using (bucket_id = 'academic-documents' and public.can_access_offering_folder(name));
create policy "assigned users upload academic files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'academic-documents' and public.can_edit_offering_folder(name));
create policy "assigned users update academic files" on storage.objects
  for update to authenticated
  using (bucket_id = 'academic-documents' and public.can_edit_offering_folder(name))
  with check (bucket_id = 'academic-documents' and public.can_edit_offering_folder(name));
create policy "assigned users remove academic files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'academic-documents' and public.can_edit_offering_folder(name));

-- After inviting the first institutional account, bootstrap the initial administrator manually:
-- update public.profiles set role = 'admin'
-- where user_id = (select id from auth.users where email = 'admin@institucion.edu');
-- Keep public sign-up disabled. Change roles only through a trusted admin path.
