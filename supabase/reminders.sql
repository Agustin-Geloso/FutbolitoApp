-- Ejecutar después de schema.sql. No modifica los partidos existentes.
begin;
create table public.push_subscriptions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 endpoint text not null unique check(length(endpoint)<2048), p256dh text not null, auth text not null,
 minutes int[] not null default array[60,30] check(minutes <@ array[60,30] and cardinality(minutes)>0),
 created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "Own devices only" on public.push_subscriptions for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.push_subscriptions from anon,authenticated;
grant select on public.push_subscriptions to authenticated;
create table public.reminder_deliveries (
 id uuid primary key default gen_random_uuid(), subscription_id uuid references public.push_subscriptions on delete cascade,
 match_id uuid references public.matches on delete cascade, starts_at timestamptz not null, minutes int not null,
 sent_at timestamptz, lease_until timestamptz, attempts int not null default 0, last_error text,
 unique(subscription_id,match_id,starts_at,minutes)
);
alter table public.reminder_deliveries enable row level security;
revoke all on public.reminder_deliveries from anon,authenticated;
grant all on public.push_subscriptions,public.reminder_deliveries to service_role;

create function public.save_push_subscription(subscription jsonb,reminders int[]) returns void
language plpgsql security definer set search_path=public as $$
declare ep text=subscription->>'endpoint';
begin
 if auth.uid() is null then raise exception 'Ingresá a tu cuenta.'; end if;
 if not (ep ~ '^https://(fcm\.googleapis\.com|[a-z0-9.-]+\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/') then raise exception 'Servicio push no compatible.'; end if;
 if coalesce(length(subscription#>>'{keys,p256dh}'),0)<20 or coalesce(length(subscription#>>'{keys,auth}'),0)<10 then raise exception 'Suscripción inválida.'; end if;
 if reminders is null or cardinality(reminders)=0 or not reminders <@ array[60,30] then raise exception 'Elegí 60 o 30 minutos.'; end if;
 insert into push_subscriptions(user_id,endpoint,p256dh,auth,minutes)
 values(auth.uid(),ep,subscription#>>'{keys,p256dh}',subscription#>>'{keys,auth}',reminders)
 on conflict(endpoint) do update set user_id=excluded.user_id,p256dh=excluded.p256dh,auth=excluded.auth,minutes=excluded.minutes;
end $$;
create function public.remove_push_subscription(target text) returns void
language sql security definer set search_path=public as $$
 delete from push_subscriptions where endpoint=target and user_id=auth.uid();
$$;

-- Reservas atómicas: evitan dos envíos simultáneos por el mismo aviso.
-- Ventana de recuperación de cinco minutos; no se envían avisos antiguos.
create function public.claim_match_reminders() returns jsonb
language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 insert into reminder_deliveries(subscription_id,match_id,starts_at,minutes)
 select s.id,m.id,m.starts_at,n from matches m join participants p on p.match_id=m.id
 join push_subscriptions s on s.user_id=p.user_id cross join lateral unnest(s.minutes) n
 where m.starts_at>now() and m.starts_at-make_interval(mins=>n)<=now()
 and m.starts_at-make_interval(mins=>n)>now()-interval '5 minutes'
 and p.created_at<=m.starts_at-make_interval(mins=>n)
 on conflict do nothing;
 with due as (
  select d.id from reminder_deliveries d join push_subscriptions s on s.id=d.subscription_id
  join matches m on m.id=d.match_id join participants p on p.match_id=m.id and p.user_id=s.user_id
  where d.sent_at is null and d.attempts<3 and (d.lease_until is null or d.lease_until<now())
  and d.minutes=any(s.minutes) and d.starts_at=m.starts_at
  and m.starts_at>now() and d.starts_at-make_interval(mins=>d.minutes)>now()-interval '5 minutes'
  order by d.starts_at limit 50 for update of d skip locked
 ), claimed as (
  update reminder_deliveries d set lease_until=now()+interval '2 minutes',attempts=attempts+1
  from due where d.id=due.id returning d.*
 ) select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'subscription_id',s.id,'endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth,'match_id',m.id,'venue',m.venue,'address',m.address,'starts_at',m.starts_at,'minutes',d.minutes)),'[]'::jsonb)
 into result from claimed d join push_subscriptions s on s.id=d.subscription_id join matches m on m.id=d.match_id;
 return result;
end $$;
revoke execute on function public.save_push_subscription(jsonb,int[]),public.remove_push_subscription(text),public.claim_match_reminders() from public,anon,authenticated;
grant execute on function public.save_push_subscription(jsonb,int[]),public.remove_push_subscription(text) to authenticated;
grant execute on function public.claim_match_reminders() to service_role;
commit;
