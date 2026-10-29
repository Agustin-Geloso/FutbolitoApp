-- PREVIO: desplegar send-reminders y crear en Vault un secreto llamado
-- futbolito_reminder_cron_secret con el mismo valor que REMINDER_CRON_SECRET.
-- También guardar en Vault futbolito_anon_jwt con la clave legacy anon del
-- proyecto (un JWT, no la publishable). El gateway verifica ese JWT;
-- x-reminder-secret autentica al cron dentro de la función.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
do $$ begin
 if not exists(select 1 from vault.decrypted_secrets where name='futbolito_reminder_cron_secret') or
 not exists(select 1 from vault.decrypted_secrets where name='futbolito_anon_jwt') then
 raise exception 'Primero configurar los secretos de Vault indicados en este archivo.'; end if;
end $$;
select cron.schedule('futbolito-match-reminders','* * * * *',$job$
 select net.http_post(
  url:='https://yjuyngjklhqtklalgfkt.supabase.co/functions/v1/send-reminders',
  headers:=jsonb_build_object('Content-Type','application/json',
   'Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='futbolito_anon_jwt' limit 1),
   'x-reminder-secret',(select decrypted_secret from vault.decrypted_secrets where name='futbolito_reminder_cron_secret' limit 1)),
  body:='{}'::jsonb,timeout_milliseconds:=60000
 );
$job$);
