# FutbolitoApp · prueba funcional

Web adaptable al celular y PWA básica, lista para alojamiento estático en Vercel. HTML, CSS y JavaScript sin dependencias de instalación. Supabase proporciona autenticación y PostgreSQL; las operaciones de escritura se validan en funciones SQL.

## Probar en tu computadora

Con Node.js instalado, ejecutar `node server.js` y abrir http://localhost:3000.

Elegir **Cargar partido de ejemplo** y luego **Armar equipos**. La demo guarda datos solo en este navegador: no comparte inscripciones entre dispositivos. También se puede completar Mi jugador y crear un partido propio.

## Conectar Supabase

1. Crear un proyecto Supabase y ejecutar `supabase/schema.sql` en SQL Editor una sola vez.
2. Copiar Project URL y clave **publishable** o **anon** desde la configuración del proyecto. Nunca usar `service_role` ni `secret`.
3. Para probar, pulsar **Conectar Supabase** en la web. La configuración se guarda en ese navegador.
4. Para todos los visitantes, completar las constantes públicas de `config.js` antes de desplegar. Estas claves son públicas por diseño; la protección está en RLS y las funciones SQL.
5. Crear una cuenta, confirmar el correo si Supabase lo solicita, ingresar y completar Mi jugador. Configurar en Supabase Auth la Site URL de Vercel. Para envíos reales de confirmación a amigos, configurar SMTP propio según las restricciones de correo de Supabase.
6. Crear un partido y copiar la invitación. Cada persona ingresa con su cuenta, completa su ficha y se suma. El creador también debe sumarse.
7. Al llegar a diez, el organizador puede guardar el reparto. Para ver nuevas inscripciones, volver a la pestaña o recargar la página.

### Registro, login y mapa

La entrada muestra **Iniciar sesión** y **Crear cuenta** cuando no hay una sesión activa. El registro requiere repetir la contraseña; la confirmación por email vuelve a la app y valida la sesión con Supabase. La sesión se renueva antes de realizar operaciones cuando está por vencer. Los errores aparecen dentro del formulario.

El proyecto actual usa `http://localhost:3000` como Site URL en Supabase. Para probar la confirmación por email, abrir esa dirección y mantener el servidor encendido. Antes de usar Vercel, configurar la URL final en Supabase Auth → URL Configuration. La prueba completa de registro necesita que el usuario ingrese su propio email, contraseña y confirme el correo; no se crearon cuentas ficticias.

En el formulario del partido, completar calle, número y ciudad y pulsar **Ver ubicación en el mapa**. Se muestra una vista de Google Maps basada en la dirección, con **Abrir en Google Maps** y **Cómo llegar**. El mapa también aparece en el detalle del partido creado. La dirección puede ser ambigua: comprobar la vista antes de compartir. No incluye búsqueda predictiva ni selección de coordenadas.

## Publicar en Vercel

Subir estos archivos al repositorio `Agustin-Geloso/FutbolitoApp` e importarlo en Vercel. Framework: **Other**. No requiere instalación ni compilación; output directory: `.`. El archivo `vercel.json` contiene esa configuración. No hay credenciales de Vercel ni Supabase incluidas en esta prueba.

## Alcance y límites de esta primera prueba

- Perfil: edad de 16 a 90, posición principal y ocho valoraciones de 1 a 10; posibilidad de ofrecerse como arquero.
- Partidos, invitaciones, cupo atómico de diez, baja e inicio de sesión con email y contraseña.
- Reparto en el navegador: examina 126 divisiones y responsables del arco, minimiza diferencias de habilidades, posiciones y edad con peso bajo. Supabase valida organizador, integrantes, cupos y arqueros al guardar. La optimalidad se calcula en el cliente; una siguiente versión puede mover el cálculo al backend.
- Para este grupo de confianza, todas las cuentas autenticadas pueden leer partidos y fichas deportivas. Las escrituras requieren las funciones autorizadas. Antes de abrir registros al público se debe restringir lectura por pertenencia/invitación.
- Los equipos guardados mantienen una instantánea de las fichas. Una alta o baja invalida el reparto. No hay cierre definitivo, cancelación, historial de partidos en pantalla ni posiciones alternativas todavía.
- PWA básica con manifiesto y caché de interfaz; la disponibilidad de instalación depende del navegador. En iPhone: Safari → Compartir → Agregar a inicio. Los datos online necesitan conexión. No es una aplicación nativa publicada en tiendas.
- Las fuentes de Google requieren conexión; el resto usa fuentes de respaldo si no están disponibles.

## Verificación

## Recordatorios

La interfaz y el backend de avisos push de 60 y 30 minutos están preparados, pero **los envíos no están activos** hasta desplegar la función, configurar VAPID y programar el cron. Ver `RECORDATORIOS.md` para activación y pruebas en dispositivos reales.

`node --test tests/balance.test.js`

Para verificar Supabase una vez conectado: dos usuarios deben intentar ocupar simultáneamente la última plaza (solo uno debe lograrlo), una cuenta ajena no debe poder guardar equipos y una baja debe invalidar el reparto. Estas verificaciones necesitan un proyecto real.
