-- Usa cuentas ficticias dentro de una transacción; revierte todos los cambios.
begin;
do $$
declare a uuid=gen_random_uuid(); b uuid=gen_random_uuid();
begin
 insert into auth.users(id,email) values(a,'avatar-a-'||a||'@example.invalid'),(b,'avatar-b-'||b||'@example.invalid');
 perform set_config('fb.test_avatar_a',a::text,true);
 perform set_config('fb.test_avatar_b',b::text,true);
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform public.save_my_avatar('data:image/jpeg;base64,/9j/AA==');
 perform set_config('request.jwt.claim.sub',b::text,true);
 perform public.save_my_avatar('data:image/jpeg;base64,/9j/AA==');
end $$;
set local role authenticated;
do $$ begin
 if (select count(*) from public.profile_avatars)<>1 then raise exception 'Fallo: la cuenta ve fotos ajenas'; end if;
 if exists(select 1 from public.profile_avatars where user_id=current_setting('fb.test_avatar_a')::uuid) then raise exception 'Fallo: lectura de foto ajena'; end if;
 if has_table_privilege('authenticated','public.profile_avatars','UPDATE') then raise exception 'Fallo: escritura directa'; end if;
 perform public.save_my_avatar(null);
 if exists(select 1 from public.profile_avatars) then raise exception 'Fallo: foto propia no eliminada'; end if;
 perform set_config('request.jwt.claim.sub','',true);
 begin
  perform public.save_my_avatar('data:image/jpeg;base64,/9j/AA==');
  raise exception using errcode='XX000',message='Fallo: escritura anónima';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
do $$ begin
 if not exists(select 1 from public.profile_avatars where user_id=current_setting('fb.test_avatar_a')::uuid) then raise exception 'Fallo: se borró la foto de otra cuenta'; end if;
 delete from auth.users where id=current_setting('fb.test_avatar_a')::uuid;
 if exists(select 1 from public.profile_avatars where user_id=current_setting('fb.test_avatar_a')::uuid) then raise exception 'Fallo: foto huérfana al eliminar usuario'; end if;
end $$;
rollback;
