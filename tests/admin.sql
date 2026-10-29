-- Prueba transaccional: solo usa registros ficticios y revierte todos los cambios.
-- Ejecutar como postgres en SQL Editor, después de admin.sql.
begin;
do $$
declare a uuid=gen_random_uuid(); u uuid=gen_random_uuid(); other_user uuid=gen_random_uuid();
 own_match uuid=gen_random_uuid(); shared_match uuid=gen_random_uuid(); separate_match uuid=gen_random_uuid();
begin
 insert into auth.users(id,email) values(a,'admin-test-'||a||'@example.invalid'),(u,'player-test-'||u||'@example.invalid'),(other_user,'other-test-'||other_user||'@example.invalid');
 insert into public.app_admins(user_id) values(a);
 insert into public.profiles(id,name,age,position,pase,control,definicion,defensa,velocidad,resistencia,fuerza,arco)
 values(u,'Prueba',25,'Defensa',5,5,5,5,5,5,5,5);
 insert into public.matches(id,owner,venue,address,starts_at,teams) values
 (own_match,u,'Propio prueba','Dirección de prueba',now()+interval '2 days',null),
 (shared_match,other_user,'Compartido prueba','Dirección de prueba',now()+interval '2 days',jsonb_build_object('a',jsonb_build_array(jsonb_build_object('id',u)),'b','[]'::jsonb)),
 (separate_match,other_user,'Borrado partido prueba','Dirección de prueba',now()+interval '2 days',null);
 insert into public.participants(match_id,user_id) values(shared_match,u);
 insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values(u,'https://fcm.googleapis.com/test-admin-'||u,'test-key','test-auth');
 perform set_config('request.jwt.claim.sub',u::text,true);
 if public.is_app_admin() then raise exception 'Fallo: usuario común es administrador'; end if;
 begin
  perform public.admin_snapshot();
  raise exception 'Fallo: acceso sin rol';
 exception when insufficient_privilege then null;
 end;
 begin
  perform public.admin_delete_match(separate_match,'Borrado partido prueba');
  raise exception 'Fallo: borrado sin rol';
 exception when insufficient_privilege then null;
 end;
 perform set_config('request.jwt.claim.sub',a::text,true);
 if not public.is_app_admin() then raise exception 'Fallo: rol admin no detectado'; end if;
 perform public.admin_snapshot();
 begin
  perform public.admin_delete_match(separate_match,'incorrecto');
  raise exception using errcode='XX000',message='Fallo: aceptó confirmación incorrecta';
 exception when raise_exception then null;
 end;
 perform public.admin_delete_match(separate_match,'Borrado partido prueba');
 if exists(select 1 from public.matches where id=separate_match) then raise exception 'Fallo: partido no eliminado'; end if;
 begin
  perform public.admin_delete_user(a,'admin-test-'||a||'@example.invalid');
  raise exception using errcode='XX000',message='Fallo: permitió eliminar administrador';
 exception when raise_exception then null;
 end;
 perform public.admin_delete_user(u,'player-test-'||u||'@example.invalid');
 if exists(select 1 from auth.users where id=u) or exists(select 1 from public.profiles where id=u)
 or exists(select 1 from public.participants where user_id=u) or exists(select 1 from public.matches where id=own_match)
 or exists(select 1 from public.push_subscriptions where user_id=u) then raise exception 'Fallo: quedaron datos del usuario'; end if;
 if not exists(select 1 from public.matches where id=shared_match and teams is null) then raise exception 'Fallo: reparto no invalidado'; end if;
 if (select count(*) from public.admin_audit where actor_id=a)<>2 then raise exception 'Fallo: registro de acciones incompleto'; end if;
 if has_table_privilege('authenticated','public.app_admins','INSERT') then raise exception 'Fallo: se permite autoasignar rol'; end if;
 raise notice 'OK: permisos, confirmaciones, protección de administradores, borrado de partidos, limpieza de usuarios y auditoría';
end $$;
rollback;
