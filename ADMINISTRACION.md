# Administración

La cuenta autorizada usa el mismo inicio de sesión que los jugadores. El rol se guarda en `public.app_admins`, sin permisos de escritura para usuarios de la app. No depende de un campo editable del perfil ni de datos enviados por el navegador.

La pestaña **Administración** permite buscar partidos y usuarios, consultar último inicio de sesión y eliminar registros con confirmación escrita. Borrar un partido elimina también las inscripciones y avisos relacionados. Borrar un usuario elimina su cuenta de Supabase Auth, ficha, dispositivos, inscripciones y partidos organizados; también invalida los repartos que contienen su ficha. Las cuentas de administrador están protegidas. Los borrados se registran por identificador en `admin_audit`.

## Instalación en un proyecto nuevo

1. Ejecutar `supabase/admin.sql` después de `schema.sql` y `reminders.sql`.
2. Asignar el rol en SQL Editor a una cuenta existente, comprobando personalmente el email:

```sql
insert into public.app_admins(user_id)
select id from auth.users where lower(email)=lower('EMAIL_DEL_ADMIN')
on conflict do nothing;
```

No hay contraseña administrativa predeterminada. No se publica el email del administrador en el código de la web. Para revocar el rol, quitar su fila de `app_admins` desde Supabase; los permisos de cada operación se verifican de nuevo en el servidor.

## Verificación

Ejecutar `tests/admin.sql` en SQL Editor. Crea datos ficticios dentro de una transacción y revierte todo al terminar; no elimina registros reales. Verifica acceso por rol, confirmación escrita, protección del administrador, limpieza de datos asociados y registro de acciones. Después, comprobar el panel con la sesión real del administrador; no es necesario borrar un registro real para validar su visualización.
