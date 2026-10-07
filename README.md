# Planificación Docente

Aplicación web para gestionar oferta académica, sílabos, la matriz del Anexo 1 y planes de clase. La propuesta usa Next.js con TypeScript para la interfaz y las acciones del servidor, Supabase Auth y PostgreSQL para usuarios y datos, y Supabase Storage para archivos privados. Vercel aloja la aplicación. No requiere Docker ni una base de datos adicional.

## Arquitectura inicial

- **Frontend y servidor web:** Next.js App Router, React y TypeScript. Las páginas y acciones del servidor verifican la sesión antes de consultar datos.
- **Autenticación y autorización:** Supabase Auth, perfiles con roles `admin` y `docente`, y políticas PostgreSQL RLS. El administrador gestiona catálogos, usuarios, períodos y ofertas; un docente consulta y modifica únicamente sílabos y planes de las asignaturas que tiene asignadas.
- **Base de datos:** Supabase PostgreSQL. Las relaciones siguen esta cadena: período → oferta de carrera → semestre ofertado → asignatura curricular → asignatura ofertada con docente.
- **Matriz del sílabo:** Univer Sheets, integrado como editor web, para filas y columnas editables, celdas combinadas, tamaños y guardado del libro. Se conserva el estado completo del libro en JSONB y una proyección estructurada de sus actividades para buscar temas por fecha.
- **Archivos:** Supabase Storage privado para documentos y versiones. La exportación DOCX usando las plantillas institucionales queda para el siguiente incremento; las plantillas todavía no se rellenan ni se descargan desde la aplicación.
- **Despliegue:** Vercel para Next.js y Supabase para Auth, PostgreSQL y Storage.

No se usa un segundo motor de datos: PostgreSQL cubre las relaciones académicas y JSONB conserva las hojas flexibles. La política RLS es la frontera de seguridad; ocultar registros en la interfaz no basta.

## Plantillas revisadas

En `plantillas/` están `silabo.docx`, `plan_de_clase_01.docx`, `plan_de_clase_02.docx` y los calendarios IPA/IIPA 2026 en PDF. El sílabo tiene secciones verticales y una matriz horizontal de 9 columnas y 101 filas. La matriz se organiza en 16 semanas y contiene las columnas Semana, N.º de actividad, Actividades docente, Forma de enseñanza, Tiempo, Lugar, Experimental autónomo, Trabajo independiente y Medios de enseñanza. El formato de ejemplo no tiene columna de fecha; la aplicación deberá añadir una fecha planificada para enlazar cada tema con el plan de clase.

El detalle de campos y su tipo de entrada está en [docs/campos-y-flujos.md](docs/campos-y-flujos.md).

## Preparación local

1. Cree un proyecto Supabase y copie la URL del proyecto y la clave publicable.
2. En Supabase, ejecute la migración `supabase/migrations/20261004000000_initial_schema.sql` desde el SQL Editor.
3. Desactive el registro público de Auth; las cuentas deben crearse mediante invitación del administrador. Cree la primera cuenta institucional e indique el rol administrador ejecutando el procedimiento descrito en la migración.
4. Copie `.env.example` a `.env.local` y complete las variables. `APP_URL` es la URL pública de la aplicación (en local, `http://localhost:3000`). `SUPABASE_SECRET_KEY` se requiere para las invitaciones y cambios administrativos de cuentas; se usa solo en el servidor. Nunca la publique con prefijo `NEXT_PUBLIC_`.
5. Use Node.js 22 o posterior, instale dependencias con `npm install` y ejecute `npm run dev`.

Este repositorio aún no contiene credenciales de un proyecto Supabase; la conexión y las cuentas reales se activan al configurar esas variables.

## Estado del primer incremento

- El administrador puede invitar docentes, activar o desactivar cuentas, y gestionar períodos y la oferta de carreras, semestres, asignaturas y docentes. La estructura curricular incluye prerrequisitos, correquisitos y horas.
- El docente solo consulta ofertas asignadas a su cuenta. Puede crear un sílabo, completar sus secciones narrativas y organizar el Anexo 1 con Univer Sheets. La fecha se agrega como columna de planificación y se proyecta junto con cada tema.
- Un plan de clase puede vincular una o más actividades del Anexo 1. Al elegir una fecha se proponen los temas coincidentes; cada plan guarda una copia de los datos de origen.
- La aplicación no se ha conectado a un proyecto Supabase ni se ha desplegado. Tampoco se implementaron todavía la generación/descarga de DOCX o PDF, el flujo de aprobación y firmas, ni la pantalla para administrar las opciones de todos los catálogos institucionales.

Para habilitar el primer administrador, primero invite su cuenta desde Supabase Auth y luego ejecute el `UPDATE` comentado al final de la migración, sustituyendo el correo de ejemplo.

## Despliegue

1. Publique el repositorio en GitHub, GitLab o Bitbucket.
2. Importe el repositorio en Vercel y deje que Vercel detecte Next.js.
3. Añada en Vercel las variables de `.env.example` para Preview y Production. Configure `APP_URL` con el dominio canónico HTTPS de producción.
4. Ejecute las migraciones SQL en el proyecto Supabase de producción y configure Auth para aceptar únicamente usuarios invitados.
5. En Supabase Auth → URL Configuration, agregue `APP_URL/auth/callback` a las Redirect URLs permitidas. La invitación lleva al docente a una pantalla para definir su contraseña; su usuario es el correo institucional.
6. Cargue los formatos institucionales aprobados al bucket privado de plantillas antes de habilitar la exportación DOCX.

## Decisiones para el primer incremento

- Los datos identificativos de carrera, semestre, asignatura, docente, paralelo, modalidad y período se derivan de la oferta académica; el docente no los vuelve a teclear.
- Los campos narrativos del sílabo y del plan de clase siguen siendo editables. Los métodos, formas de enseñanza y modalidades se eligen de listas iniciales; el mantenimiento de los catálogos institucionales requiere completar una pantalla administrativa.
- El calendario institucional se almacena como eventos por período. El Anexo 1 tiene semana (1 a 16) y fecha planificada por actividad; al elegir esa fecha en un plan de clase se recuperan los temas coincidentes. Se permite asociar más de una actividad a una sesión de dos horas o una actividad a un plan de una hora.
- Las plantillas entregadas sirven de referencia. Antes de generar documentos oficiales se deben sustituir los nombres y firmas del ejemplo por los responsables vigentes de la institución.
