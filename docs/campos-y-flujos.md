# Campos de los documentos y flujo de planificación

Este inventario se levantó de las plantillas entregadas en `plantillas/`. En el sílabo el texto está principalmente en párrafos; el Anexo 1 es una matriz de 9 columnas con 101 filas, incluidos rótulos de unidad y actividades de 16 semanas. El plan de clase tiene secciones narrativas y firmas al final.

Las reglas siguientes describen la captura que requiere cada campo. El primer incremento ya completa automáticamente la identificación desde la oferta, guarda borradores de las secciones narrativas, edita el Anexo 1 como hoja de cálculo y vincula temas con planes de clase por fecha. La exportación con el diseño DOCX institucional y el flujo de firmas aún deben implementarse.

## Reglas de entrada

| Grupo | Campos | Cómo se completan |
|---|---|---|
| Identificación del documento | Institución, carrera y código, semestre, asignatura y código, prerrequisito y correquisito, período académico, modalidad, docente responsable, paralelo, nivel de estudios, horas | Se rellenan desde la oferta vigente, el perfil y los datos institucionales. Los cambios curriculares corresponden al administrador. |
| Datos de período | Nombre/código del período, fecha inicial/final, duración académica de 16 semanas y calendario | El administrador crea el período. Las fechas derivadas de la oferta aparecen bloqueadas en el sílabo. |
| Fundamentación | Consecución al perfil de egreso, aporte a otras asignaturas, capacidades generales, formación cultural, problema/objeto/objetivo | Texto libre del docente. Las secciones pueden guardarse como borrador y reutilizarse como base de sílabos futuros, sin copiar automáticamente contenido de otra asignatura. |
| Objetivos | Objetivos generales/específicos, sistema general de conocimientos, habilidades y valores por unidad | El docente redacta texto y selecciona la unidad curricular. El número/nombre de la unidad puede salir de un catálogo de unidades. |
| Evaluación | Actividades formativas/sumativas, criterios, ponderaciones, escala y condiciones institucionales | Actividades y criterios son editables; tipos de evaluación se seleccionan de catálogo. Puntajes, totales y equivalencias deben validarse/calcularse. Las reglas institucionales se configuran por administrador; el docente no las reescribe por cada sílabo. |
| Plan temático | Tipos C, CP, S, T, L, E y distribución de horas D, THP, TI, THA | Se modelan como valores estructurados. Los totales se calculan y se comparan con las horas de la asignatura; los valores dependen de cada período y oferta. |
| Orientaciones metodológicas | Modelo educativo, teoría-práctica, motivación, pensamiento crítico, atención a necesidades educativas, trabajo autónomo | Texto libre con encabezados editables. Se podrá incluir una plantilla institucional para párrafos recomendados. |
| Recursos y bibliografía | Recursos básicos/audiovisuales/técnicos y referencias bibliográficas | Recursos se eligen por categoría desde listas con opción “Otro”; bibliografía se agrega como registros editables repetibles (autor, año, título, editorial/URL/ISBN). |
| Firmas y lugar/fecha | Machala y fecha de elaboración, docente, coordinador, autoridad aprobadora y cargos | Fecha y docente salen del sistema; revisores y aprobadores salen de la configuración institucional por período/carrera. No se conservan las personas del documento de ejemplo como responsables predeterminados. |

## Anexo 1: planificación de 16 semanas

La matriz del ejemplo contiene estas columnas: Semana; N.º de actividad; Actividades docente; Forma de enseñanza; Tiempo; Lugar; Experimental autónomo; Trabajo independiente; Medios de enseñanza. El docente necesita edición de hojas de cálculo: crear/quitar columnas y filas, combinar/separar celdas, cambiar anchos/altos, editar texto y conservar el formato de celdas. La matriz se guarda como un libro flexible y en paralelo se mantiene una lectura estructurada de los campos que el plan de clase necesita.

| Campo | Regla |
|---|---|
| Semana | Número controlado de 1 a 16. Las filas de título de unidad pueden quedar sin semana. |
| Número de actividad | Secuencia por actividad; se puede recalcular al insertar o quitar actividades, pero se permite modificarla si la plantilla institucional así lo requiere. |
| Actividad docente/tema | Texto libre. Este tema es la fuente que propone contenido al plan de clase. |
| Forma de enseñanza | Lista administrada (por ejemplo conferencia, seminario, clase práctica, taller, laboratorio, evaluación). |
| Tiempo | Duración estructurada en horas/minutos o una selección del catálogo; no solo texto libre, para sumar y validar horas. |
| Lugar | Lista de espacios institucionales con opción “Otro”. |
| Experimental autónomo, trabajo independiente, medios | Texto libre; materiales pueden registrarse además como elementos por categoría para permitir selección y exportación. |
| Fecha planificada | Se agrega a cada actividad como campo operativo. El ejemplo entregado solo muestra semana y no incluye fechas. Se escoge o deriva de la semana, calendario del período y horario de la asignatura. |
| Columnas añadidas por docente | Se conservan en el libro. Si se renombran o eliminan columnas estándar, la aplicación debe pedir confirmación porque pueden dejar de alimentar el plan de clase. |

El administrador define el período, sus fechas y los eventos/feriados institucionales. La duración de 16 semanas se guarda en el período y es ajustable para otros tipos de oferta. Cada curso puede tener horario semanal para proponer fechas de clase; esas propuestas se muestran para revisión del docente.

## Plan de clase

La carrera, asignatura, período, paralelo, docente y fecha se derivan de la oferta y de la sesión elegida. El tema se carga desde las filas del Anexo 1 con la misma fecha. Si hay varios temas el mismo día, se muestran todos y el docente escoge uno o más. Si la fecha no coincide con una fila, se permite vincular manualmente una actividad de la semana pertinente y se conserva esa relación.

El docente puede generar más de un plan para una misma fecha: un plan de dos horas con varias actividades vinculadas, o planes separados por hora. Cada plan guarda su duración y un orden de actividades asociadas.

Los campos editables que se observan en las plantillas son: número del plan; número de actividad (derivado de las actividades elegidas); actividad docente (temas del Anexo 1); método; forma de enseñanza; recursos didácticos; desarrollo/explicación de contenidos; introducción (saludo y organización, asistencia, trabajo con la fecha, chequeo del trabajo independiente, motivación, anuncio del tema y objetivo); conclusiones (conclusiones, evaluación del aprendizaje, trabajo independiente, tema siguiente y técnica de cierre); bibliografía básica y de consulta. Método, forma de enseñanza, recursos y lugar pueden seleccionarse de listas con opción de texto propio. Las redacciones de objetivo, motivación, desarrollo, conclusiones y evaluación permanecen bajo control docente.

## Validaciones antes de exportar

- Oferta asignada a un docente, un período abierto y un paralelo identificable.
- Sílabos asociados a una única oferta; no repetir identificación ya disponible en el sistema.
- Semanas dentro del rango del período y fechas sin conflicto con cierres, feriados y fechas de inicio/fin.
- Sumas de horas por componente y por unidad coherentes con las horas totales de la oferta.
- Actividades del plan de clase vinculadas a filas del Anexo 1 o marcadas explícitamente como excepción.
- Responsables de revisión y aprobación vigentes para la carrera y período.
