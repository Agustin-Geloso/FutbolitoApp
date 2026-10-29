-- Ejecutar una vez en el SQL Editor de un proyecto Supabase nuevo.
create table public.profiles (
 id uuid primary key references auth.users on delete cascade,
 name text not null check(length(trim(name)) between 1 and 50),
 age int not null check(age between 16 and 90),
 position text not null check(position in ('Arquero','Defensa','Mediocampista defensivo','Mediocampista ofensivo','Delantero')),
 volunteer boolean not null default false,
 pase int not null check(pase between 1 and 10), control int not null check(control between 1 and 10),
 definicion int not null check(definicion between 1 and 10), defensa int not null check(defensa between 1 and 10),
 velocidad int not null check(velocidad between 1 and 10), resistencia int not null check(resistencia between 1 and 10),
 fuerza int not null check(fuerza between 1 and 10), arco int not null check(arco between 1 and 10)
);
create table public.matches (
 id uuid primary key default gen_random_uuid(), owner uuid not null references auth.users,
 venue text not null check(length(trim(venue)) between 1 and 100),
 address text not null check(length(trim(address)) between 1 and 200), starts_at timestamptz not null,
 teams jsonb, created_at timestamptz not null default now()
);
create table public.participants (
 match_id uuid references public.matches on delete cascade,
 user_id uuid references public.profiles on delete cascade,
 created_at timestamptz not null default now(), primary key(match_id,user_id)
);
alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.participants enable row level security;
-- Prueba para un grupo de confianza: cuentas autenticadas pueden leer partidos
-- y fichas deportivas. No se exponen correos ni contraseñas.
create policy "read profiles" on public.profiles for select to authenticated using(true);
create policy "read matches" on public.matches for select to authenticated using(true);
create policy "read participants" on public.participants for select to authenticated using(true);
grant select on public.profiles, public.matches, public.participants to authenticated;
revoke insert,update,delete on public.profiles, public.matches, public.participants from anon,authenticated;

create function public.save_profile(data jsonb) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Ingresá a tu cuenta.'; end if;
 insert into profiles values(auth.uid(),data->>'name',(data->>'age')::int,data->>'position',coalesce((data->>'volunteer')::boolean,false),
 (data->>'pase')::int,(data->>'control')::int,(data->>'definicion')::int,(data->>'defensa')::int,
 (data->>'velocidad')::int,(data->>'resistencia')::int,(data->>'fuerza')::int,(data->>'arco')::int)
 on conflict(id) do update set name=excluded.name,age=excluded.age,position=excluded.position,volunteer=excluded.volunteer,
 pase=excluded.pase,control=excluded.control,definicion=excluded.definicion,defensa=excluded.defensa,
 velocidad=excluded.velocidad,resistencia=excluded.resistencia,fuerza=excluded.fuerza,arco=excluded.arco;
end $$;
create function public.create_match(data jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
 if auth.uid() is null then raise exception 'Ingresá a tu cuenta.'; end if;
 if (data->>'starts_at')::timestamptz <= now() then raise exception 'Elegí una fecha futura.'; end if;
 insert into matches(owner,venue,address,starts_at) values(auth.uid(),data->>'venue',data->>'address',(data->>'starts_at')::timestamptz) returning id into result;
 return result;
end $$;
create function public.join_match(target uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Ingresá a tu cuenta.'; end if;
 perform 1 from matches where id=target for update;
 if not found then raise exception 'Partido inexistente.'; end if;
 if not exists(select 1 from profiles where id=auth.uid()) then raise exception 'Completá tu perfil.'; end if;
 if exists(select 1 from matches where id=target and starts_at<=now()) then raise exception 'El partido ya comenzó.'; end if;
 if exists(select 1 from participants where match_id=target and user_id=auth.uid()) then raise exception 'Ya estás inscripto.'; end if;
 if (select count(*) from participants where match_id=target)>=10 then raise exception 'El partido está completo.'; end if;
 insert into participants(match_id,user_id) values(target,auth.uid());
 update matches set teams=null where id=target;
end $$;
create function public.leave_match(target uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Ingresá a tu cuenta.'; end if;
 perform 1 from matches where id=target for update;
 delete from participants where match_id=target and user_id=auth.uid();
 if found then update matches set teams=null where id=target; end if;
end $$;
create function public.save_teams(target uuid,result jsonb) returns void language plpgsql security definer set search_path=public as $$
declare assigned uuid[]; actual uuid[];
begin
 perform 1 from matches where id=target and owner=auth.uid() for update;
 if not found then raise exception 'Solo el organizador puede guardar equipos.'; end if;
 if jsonb_typeof(result->'a') is distinct from 'array' or jsonb_typeof(result->'b') is distinct from 'array' then raise exception 'Reparto inválido.'; end if;
 if jsonb_array_length(result->'a')<>5 or jsonb_array_length(result->'b')<>5 then raise exception 'Cada equipo debe tener cinco jugadores.'; end if;
 select array_agg((v->>'id')::uuid order by (v->>'id')::uuid) into assigned from jsonb_array_elements((result->'a')||(result->'b')) v;
 select array_agg(user_id order by user_id) into actual from participants where match_id=target;
 if assigned is distinct from actual or array_length(actual,1)<>10 then raise exception 'La lista cambió. Actualizá y volvé a repartir.'; end if;
 if not exists(select 1 from jsonb_array_elements(result->'a') p join profiles f on f.id=(p->>'id')::uuid where f.id=(result->>'keeperA')::uuid and (f.position='Arquero' or f.volunteer))
 or not exists(select 1 from jsonb_array_elements(result->'b') p join profiles f on f.id=(p->>'id')::uuid where f.id=(result->>'keeperB')::uuid and (f.position='Arquero' or f.volunteer)) then raise exception 'Asigná un arquero válido por equipo.'; end if;
 -- Reemplazar las fichas enviadas por datos reales del servidor.
 result=jsonb_set(result,'{a}',(select jsonb_agg(to_jsonb(f) order by p.ord) from jsonb_array_elements(result->'a') with ordinality p(v,ord) join profiles f on f.id=(p.v->>'id')::uuid));
 result=jsonb_set(result,'{b}',(select jsonb_agg(to_jsonb(f) order by p.ord) from jsonb_array_elements(result->'b') with ordinality p(v,ord) join profiles f on f.id=(p.v->>'id')::uuid));
 update matches set teams=result where id=target;
end $$;
revoke execute on function public.save_profile(jsonb),public.create_match(jsonb),public.join_match(uuid),public.leave_match(uuid),public.save_teams(uuid,jsonb) from public,anon;
grant execute on function public.save_profile(jsonb),public.create_match(jsonb),public.join_match(uuid),public.leave_match(uuid),public.save_teams(uuid,jsonb) to authenticated;
