-- Ejecutar después de schema.sql y reminders.sql. No asigna roles ni borra datos.
begin;
create table public.app_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;
revoke all on public.app_admins from anon,authenticated;

create table public.admin_audit (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null,
 action text not null, target_id uuid not null, created_at timestamptz not null default now()
);
alter table public.admin_audit enable row level security;
revoke all on public.admin_audit from anon,authenticated;

create function public.is_app_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.app_admins where user_id=(select auth.uid()));
$$;

create function public.admin_snapshot() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_app_admin() then raise exception 'No tenés permisos de administrador.' using errcode='42501'; end if;
 select jsonb_build_object(
 'users',coalesce((select jsonb_agg(to_jsonb(u) order by u.created_at desc) from (
  select a.id,a.email,a.created_at,a.last_sign_in_at,p.name,
   exists(select 1 from public.app_admins r where r.user_id=a.id) as is_admin,
   (select count(*) from public.participants x where x.user_id=a.id) as participations,
   (select count(*) from public.matches m where m.owner=a.id) as owned_matches
  from auth.users a left join public.profiles p on p.id=a.id
 )u),'[]'::jsonb),
 'matches',coalesce((select jsonb_agg(to_jsonb(m) order by m.starts_at desc) from (
  select x.id,x.venue,x.address,x.starts_at,a.email as owner_email,
   (select count(*) from public.participants p where p.match_id=x.id) as participants
  from public.matches x left join auth.users a on a.id=x.owner
 )m),'[]'::jsonb)) into result;
 return result;
end $$;

create function public.admin_delete_match(target uuid,confirmation text) returns void
language plpgsql security definer set search_path='' as $$
declare match_name text;
begin
 if not public.is_app_admin() then raise exception 'No tenés permisos de administrador.' using errcode='42501'; end if;
 select venue into match_name from public.matches where id=target for update;
 if not found then raise exception 'El partido ya no existe.'; end if;
 if confirmation is distinct from match_name then raise exception 'El nombre de confirmación no coincide.'; end if;
 insert into public.admin_audit(actor_id,action,target_id) values(auth.uid(),'delete_match',target);
 delete from public.matches where id=target;
end $$;

create function public.admin_delete_user(target uuid,confirmation text) returns void
language plpgsql security definer set search_path='' as $$
declare user_email text;
begin
 if not public.is_app_admin() then raise exception 'No tenés permisos de administrador.' using errcode='42501'; end if;
 if target=auth.uid() or exists(select 1 from public.app_admins where user_id=target) then
  raise exception 'No se pueden eliminar cuentas de administrador desde este panel.';
 end if;
 select email into user_email from auth.users where id=target for update;
 if not found then raise exception 'El usuario ya no existe.'; end if;
 if confirmation is distinct from user_email then raise exception 'El email de confirmación no coincide.'; end if;
 -- Bloquear los partidos afectados igual que las funciones de inscripción.
 perform m.id from public.matches m where m.owner=target or exists(
  select 1 from public.participants p where p.match_id=m.id and p.user_id=target
 ) order by m.id for update;
 -- Limpiar repartos que contienen la ficha del jugador, aunque se haya bajado.
 update public.matches m set teams=null where exists(
  select 1 from jsonb_array_elements(coalesce(m.teams->'a','[]'::jsonb)||coalesce(m.teams->'b','[]'::jsonb)) p
  where p->>'id'=target::text
 ) or exists(select 1 from public.participants p where p.match_id=m.id and p.user_id=target);
 -- Los partidos organizados por esa cuenta se eliminan junto a sus inscripciones.
 delete from public.matches where owner=target;
 insert into public.admin_audit(actor_id,action,target_id) values(auth.uid(),'delete_user',target);
 -- La FK de profiles limpia participaciones; push_subscriptions limpia dispositivos
 -- y recordatorios. Supabase Auth elimina identidades y sesiones por sus FK.
 delete from auth.users where id=target;
end $$;
revoke execute on function public.is_app_admin(),public.admin_snapshot(),public.admin_delete_match(uuid,text),public.admin_delete_user(uuid,text) from public,anon;
grant execute on function public.is_app_admin(),public.admin_snapshot(),public.admin_delete_match(uuid,text),public.admin_delete_user(uuid,text) to authenticated;
commit;
