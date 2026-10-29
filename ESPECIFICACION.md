# FutbolitoApp — primera versión

## Objetivo

Organizar partidos de fútbol 5 mediante un enlace de invitación y formar dos equipos de cinco jugadores con el mejor equilibrio posible según los perfiles disponibles. El equilibrio es una estimación, no una garantía del resultado deportivo.

## Flujo principal

1. Una persona se registra y completa su perfil.
2. Crea un partido con nombre de cancha, dirección, ubicación, fecha y hora con zona horaria.
3. Comparte el enlace de invitación usando las opciones de su teléfono o copiándolo.
4. Cada invitado abre el enlace, se registra o inicia sesión y confirma su participación.
5. Al completar diez participantes, el sistema calcula y muestra ambos equipos y sus posiciones.
6. Todos pueden consultar cancha, horario y un enlace para abrir la ubicación en Google Maps.

El creador también debe confirmar su participación: crear un partido no ocupa automáticamente una plaza.

## Perfil del jugador

- Nombre o apodo y edad.
- Posición principal y posiciones alternativas: arquero, defensa, mediocampista defensivo, mediocampista ofensivo y delantero.
- Habilidades del 1 al 10: pase, control, definición, defensa y habilidad de arquero.
- Condición física del 1 al 10: velocidad, resistencia y fuerza.
- Disposición a ocupar el arco si faltan arqueros.

Las valoraciones iniciales son declaradas por cada jugador. Una etapa posterior puede incorporar evaluaciones de compañeros e historial de partidos. Altura y peso pueden ser opcionales; no se deben interpretar automáticamente como nivel futbolístico.

## Reglas de inscripción

- Máximo diez participantes confirmados; una misma cuenta no puede anotarse dos veces.
- Reservar la última plaza mediante una operación atómica en el servidor para evitar sobrecupos.
- El enlace permite encontrar el partido; la inscripción requiere una sesión autenticada.
- Si alguien se baja antes del cierre, se liberará la plaza y los equipos volverán a estado pendiente hasta completar diez.
- La primera versión no incluye lista de espera.
- El organizador puede cerrar las inscripciones y fijar los equipos. Cualquier cambio posterior requiere reabrir el partido y comunicar el nuevo reparto dentro de la app.
- Un partido cancelado o finalizado no acepta inscripciones.

## Formación de equipos

Con diez participantes existen 126 divisiones distintas en dos grupos de cinco, ignorando el intercambio de nombres entre ambos equipos. Se pueden evaluar todas sin recurrir a un reparto aleatorio o a inteligencia artificial.

Para cada división, asignar roles válidos a los integrantes y calcular un costo normalizado que combine:

- Diferencia de nivel técnico agregado.
- Diferencia de velocidad, resistencia y fuerza.
- Cobertura defensiva y ofensiva.
- Adecuación de cada jugador a su posición principal o alternativa.
- Diferencia de nivel entre arqueros.
- Diferencia de edad media con un peso bajo y configurable.

La selección minimiza ese costo. Las ponderaciones iniciales son hipótesis de producto y deben ajustarse con resultados reales. No descontar habilidad de forma automática por edad.

Restricciones prioritarias:

- Exactamente cinco jugadores por equipo y un responsable del arco por equipo.
- Si hay dos arqueros disponibles, distribuir uno en cada equipo.
- Si faltan arqueros, utilizar voluntarios y mostrar que el arco es provisional. Si no hay suficientes voluntarios, pedir al organizador que asigne los responsables antes de fijar los equipos.
- No exigir las cinco posiciones distintas simultáneamente: la formación de fútbol 5 debe adaptarse a los perfiles presentes.
- Si varias soluciones tienen el mismo costo, aplicar un desempate estable para que el reparto no cambie al recargar la página.

Mostrar una explicación del reparto: comparación de promedios, posiciones asignadas y carencias detectadas. Evitar porcentajes de justicia que no hayan sido validados.

## Pantallas

1. Registro e inicio de sesión.
2. Mi perfil y edición de habilidades.
3. Mis partidos.
4. Crear o editar partido.
5. Invitación y confirmación de participación.
6. Detalle del partido con participantes, cupos, cancha, horario y acceso a Google Maps.
7. Equipos y explicación del equilibrio.

## Datos principales

- Usuario: identidad y datos de acceso.
- Perfil: edad, habilidades, condición física y posiciones.
- Cancha: nombre, dirección y coordenadas opcionales.
- Partido: organizador, cancha, fecha/hora, zona horaria, estado y token de invitación no predecible.
- Participación: partido, usuario, fecha de inscripción y estado; combinación partido/usuario única.
- Reparto: versión, instantánea de las valoraciones utilizadas, parámetros y costo obtenido.
- Asignación: reparto, participante, equipo y rol.

Guardar la instantánea del perfil para que editar habilidades después del cierre no altere silenciosamente equipos ya fijados.

## Acceso y ubicación

Solo el organizador puede modificar, cancelar o fijar su partido. Los participantes pueden administrar su propia inscripción dentro de los estados habilitados. La validación y el reparto deben ejecutarse en el servidor.

El enlace compartido muestra los datos necesarios para decidir si participar. Los perfiles completos y las estadísticas individuales quedan disponibles solo para las personas autorizadas; no exponer correos ni fecha de nacimiento en la invitación.

Para la primera versión basta un enlace externo a Google Maps con coordenadas o una dirección codificada correctamente. Un mapa incrustado y la búsqueda automática de canchas quedan fuera del alcance inicial.

## Criterios de aceptación

- Una invitación abierta desde otro dispositivo permite registrarse y sumarse al mismo partido.
- Dos solicitudes simultáneas por la última plaza producen una sola inscripción exitosa.
- Diez participantes generan dos equipos de cinco sin duplicaciones ni omisiones.
- Dos arqueros quedan en equipos distintos y los roles respetan las alternativas disponibles.
- La ausencia de arqueros se comunica y requiere resolver los roles antes del cierre.
- Una baja invalida el reparto pendiente y una nueva inscripción permite recalcularlo.
- La cancha y el horario aparecen en el detalle y Google Maps abre la ubicación elegida.
- Los cambios de perfil posteriores no modifican un reparto fijado.
- Un usuario no puede editar partidos ajenos ni acceder a estadísticas sin autorización.

## Decisión pendiente antes de implementar

Elegir entre una app web adaptable a celulares, accesible directamente por el enlace, o aplicaciones instalables para Android/iOS. Esa decisión determina la arquitectura y el proceso de publicación. Esta especificación no representa una aplicación implementada.
