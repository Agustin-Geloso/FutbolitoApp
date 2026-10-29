-- Fotos compactas de 256 px. Acceso exclusivo a la propia cuenta.
begin;
create table public.profile_avatars (
 user_id uuid primary key references auth.users(id) on delete cascade,
 photo text not null check(length(photo)<=70000),
 updated_at timestamptz not null default now()
);
alter table public.profile_avatars enable row level security;
revoke all on public.profile_avatars from anon,authenticated;
grant select on public.profile_avatars to authenticated;
create policy "Read own avatar" on public.profile_avatars for select to authenticated using(user_id=(select auth.uid()));
create function public.save_my_avatar(photo text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Ingresá a tu cuenta.' using errcode='42501'; end if;
 if photo is null then
  delete from public.profile_avatars where user_id=auth.uid();
  return;
 end if;
 if length(photo)>70000 or photo !~ '^data:image/jpeg;base64,/9j/[A-Za-z0-9+/]*={0,2}$' then
  raise exception 'La foto debe ser una imagen JPEG compacta.';
 end if;
 if substring(decode(substring(photo from 24),'base64') from 1 for 3)<>decode('/9j/','base64') then
  raise exception 'La imagen no es válida.';
 end if;
 insert into public.profile_avatars(user_id,photo) values(auth.uid(),photo)
 on conflict(user_id) do update set photo=excluded.photo,updated_at=now();
end $$;
revoke execute on function public.save_my_avatar(text) from public,anon;
grant execute on function public.save_my_avatar(text) to authenticated;
commit;
