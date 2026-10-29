# Recordatorios de partidos

Implementación Web Push: permite elegir avisos de 60 y 30 minutos antes en **Mi cuenta → Recordatorios**. Se envían a los dispositivos activados del jugador, siempre que siga inscripto. Cada dispositivo se habilita por separado. Cerrar sesión desactiva su suscripción en el servidor; cerrar la pestaña mantiene los avisos.

## Estado

El código está preparado. **Los envíos no están activos hasta completar el despliegue, las claves y la tarea programada.** El botón muestra “En preparación” mientras falta la clave pública. No se solicitaron permisos de notificación ni se enviaron avisos durante el desarrollo.

## Activación con Vercel y Supabase

1. Publicar la web en Vercel y tener su URL HTTPS definitiva. Configurar también esa URL en Supabase Auth.
2. Ejecutar `supabase/reminders.sql` en SQL Editor después del esquema inicial. Habilita tablas de dispositivos y entregas; cada jugador solo puede leer sus propias suscripciones. Las reservas de avisos solo son accesibles al servidor.
3. Ejecutar `node scripts/setup-reminders.js https://tu-app.vercel.app mailto:tu-email`. El script crea `.env.reminders.local`, ignorado por Git, y coloca solo la clave pública en `config.js`. No reemplaza un archivo privado existente. No publicar ni compartir el archivo privado.
4. Desplegar la función `supabase/functions/send-reminders` en el proyecto `yjuyngjklhqtklalgfkt`, manteniendo **Verify JWT activado**. Con Supabase CLI: `supabase functions deploy send-reminders --project-ref yjuyngjklhqtklalgfkt`.
5. Configurar los secretos del archivo local en Edge Functions → Secrets, o usar `supabase secrets set --env-file .env.reminders.local --project-ref yjuyngjklhqtklalgfkt`. `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los proporciona Supabase al runtime; no copiarlos al frontend.
6. En Vault, crear `futbolito_reminder_cron_secret` con el valor de `REMINDER_CRON_SECRET`. Crear `futbolito_anon_jwt` con la clave **legacy anon** JWT del proyecto (no `service_role`, ni la clave `sb_publishable_...`). El gateway valida ese JWT y la función exige además el secreto del cron.
7. Ejecutar `supabase/schedule-reminders.sql`. Crea o actualiza la tarea `futbolito-match-reminders`, que invoca la función cada minuto. No ejecutar antes de tener la función y los secretos.
8. Volver a publicar la web para incluir la clave VAPID pública. Ingresar desde el dispositivo, ir a **Mi cuenta**, elegir horarios y tocar **Activar en este dispositivo**. Aceptar el permiso personalmente.

No hay que contratar un servidor adicional: el cron y la función viven en Supabase. El consumo cuenta para los límites del plan.

## Horarios y entrega

Los partidos se guardan como instantes UTC; el navegador convierte la hora local al crearlos. La tarea detecta cada umbral según la fecha real guardada. Reserva hasta 50 entregas por ejecución y reintenta errores temporales hasta tres veces, con una ventana de recuperación de cinco minutos. No envía recordatorios previos a la inscripción ni avisos de partidos que ya empezaron. Si alguien se baja, no se reservan nuevos avisos para esa persona.

La clave única por dispositivo, partido, fecha de inicio y umbral evita crear recordatorios duplicados. La etiqueta de notificación reemplaza una entrega repetida en el dispositivo si ocurre un fallo entre el envío y su confirmación. La entrega depende del navegador, la conexión, la batería y los permisos; no garantiza un instante exacto. Una interrupción de más de cinco minutos puede perder ese aviso.

## Prueba de aceptación después del despliegue

1. Registrarse, activar las notificaciones y sumarse a un partido que empiece en 61 minutos. Al cruzar el umbral de 60 debe llegar el primer aviso, y a los 30 el segundo.
2. Cerrar la pestaña y comprobar la entrega. Tocar la notificación debe abrir ese partido.
3. Ejecutar la función dos veces: no debe crear dos avisos para el mismo umbral/dispositivo.
4. Darse de baja de otro partido antes del umbral: no debe llegar su recordatorio.
5. Desmarcar uno de los horarios y guardar: solo debe llegar el elegido.
6. Desactivar y verificar que se elimina la suscripción propia. Una cuenta diferente no puede listar las suscripciones ajenas.

En iPhone, instalar primero desde Safari → Compartir → Agregar a pantalla de inicio y abrir desde allí (iOS 16.4 o posterior). En navegadores sin Push API, la interfaz explica que no es compatible. Para frenar los envíos globalmente: `select cron.unschedule('futbolito-match-reminders');`.

Pruebas locales: `node --test tests/*.test.js`. No verifican entregas reales, permisos del teléfono ni el cron remoto.
