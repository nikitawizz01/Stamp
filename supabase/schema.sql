-- =====================================================================
-- Stamp — database setup for Supabase
-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- Safe to re-run: functions are replaced, tables/policies are created if missing.
--
-- Why the counter can't be reset from the browser:
--   * The free-download counter lives here, not in the browser.
--   * Browsers have NO write access to any table (RLS denies everything).
--   * The only way to change the counter is consume_download(), which
--     checks the limit and increments it in one locked transaction.
--   * The counter is keyed by a normalised hash of the email, so a new
--     account with the same address, a "+alias" or Gmail dots, or
--     deleting and re-creating the account does not reset it.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- tables ---------------------------------------------------
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  created_at          timestamptz not null default now(),
  is_pro              boolean     not null default false,  -- set only by you / a payment webhook
  pro_until           timestamptz,
  privacy_version     text,
  privacy_accepted_at timestamptz
);

create table if not exists public.free_usage (
  email_key  text primary key,               -- sha256 of the normalised email, never the email itself
  free_used  int  not null default 0 check (free_used >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.consents (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  document    text not null default 'privacy',
  version     text not null,
  accepted_at timestamptz not null default now()
);

create table if not exists public.downloads (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('free', 'pro')),
  created_at timestamptz not null default now()
);
create index if not exists downloads_user_idx on public.downloads(user_id);

-- ---------- row level security: deny by default ----------------------
alter table public.profiles   enable row level security;
alter table public.free_usage enable row level security;
alter table public.consents   enable row level security;
alter table public.downloads  enable row level security;

-- Users may READ their own profile. Nobody may write from the browser.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());

revoke insert, update, delete on public.profiles   from anon, authenticated;
revoke all                    on public.free_usage from anon, authenticated;
revoke all                    on public.consents   from anon, authenticated;
revoke all                    on public.downloads  from anon, authenticated;

-- ---------- settings (change these when you change the rules) ---------
create or replace function public.free_limit() returns int
language sql immutable as $$ select 2 $$;

-- Must match PRIVACY_VERSION in config.js. Bump both when the policy changes:
-- every user will be asked to accept the new version before downloading.
create or replace function public.current_privacy_version() returns text
language sql immutable as $$ select '2026-10-03' $$;

-- ---------- helpers --------------------------------------------------
-- Normalise so that Name+promo@gmail.com, n.a.m.e@gmail.com and name@gmail.com
-- share one free allowance. Only a hash is stored.
create or replace function public.email_key(e text) returns text
language plpgsql immutable set search_path = public, extensions as $$
declare v_local text; v_domain text;
begin
  e := lower(trim(coalesce(e, '')));
  v_local  := split_part(split_part(e, '@', 1), '+', 1);
  v_domain := split_part(e, '@', 2);
  if v_domain in ('gmail.com', 'googlemail.com') then
    v_local := replace(v_local, '.', '');
    v_domain := 'gmail.com';
  end if;
  return encode(extensions.digest(v_local || '@' || v_domain, 'sha256'), 'hex');
end $$;

-- Create a profile row for every new user.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- API called from the website ------------------------------
create or replace function public.get_quota() returns json
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_p     public.profiles;
  v_email text;
  v_used  int;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  insert into public.profiles (id) values (v_uid) on conflict do nothing;
  select * into v_p from public.profiles where id = v_uid;
  select email into v_email from auth.users where id = v_uid;
  select free_used into v_used from public.free_usage where email_key = public.email_key(v_email);
  return json_build_object(
    'used',       coalesce(v_used, 0),
    'limit',      public.free_limit(),
    'pro',        v_p.is_pro and (v_p.pro_until is null or v_p.pro_until > now()),
    'privacy_ok', v_p.privacy_version is not distinct from public.current_privacy_version()
  );
end $$;

create or replace function public.accept_privacy(v text) returns json
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if v is distinct from public.current_privacy_version() then
    raise exception 'outdated_privacy_version';
  end if;
  insert into public.profiles (id) values (v_uid) on conflict do nothing;
  update public.profiles set privacy_version = v, privacy_accepted_at = now() where id = v_uid;
  insert into public.consents (user_id, version) values (v_uid, v);
  return public.get_quota();
end $$;

-- The only way to spend a free download. Atomic: two tabs clicking at the
-- same moment cannot both pass the check.
create or replace function public.consume_download() returns json
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_p     public.profiles;
  v_email text;
  v_key   text;
  v_used  int;
  v_lim   int := public.free_limit();
  v_pro   boolean;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  insert into public.profiles (id) values (v_uid) on conflict do nothing;
  select * into v_p from public.profiles where id = v_uid for update;

  if v_p.privacy_version is distinct from public.current_privacy_version() then
    return json_build_object('ok', false, 'reason', 'privacy', 'used', 0, 'limit', v_lim, 'pro', false);
  end if;

  v_pro := v_p.is_pro and (v_p.pro_until is null or v_p.pro_until > now());
  select email into v_email from auth.users where id = v_uid;
  v_key := public.email_key(v_email);

  insert into public.free_usage (email_key) values (v_key) on conflict do nothing;
  select free_used into v_used from public.free_usage where email_key = v_key for update;

  if v_pro then
    insert into public.downloads (user_id, kind) values (v_uid, 'pro');
    return json_build_object('ok', true, 'pro', true, 'used', v_used, 'limit', v_lim);
  end if;

  if v_used >= v_lim then
    return json_build_object('ok', false, 'reason', 'limit', 'pro', false, 'used', v_used, 'limit', v_lim);
  end if;

  update public.free_usage set free_used = free_used + 1, updated_at = now() where email_key = v_key;
  insert into public.downloads (user_id, kind) values (v_uid, 'free');
  return json_build_object('ok', true, 'pro', false, 'used', v_used + 1, 'limit', v_lim);
end $$;

-- Right to erasure. Profile, consents and download history are deleted
-- with the user (on delete cascade). The hashed email key in free_usage is
-- kept so the free allowance isn't reset — this is disclosed in the policy.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- ---------- who may call what ----------------------------------------
revoke execute on function public.get_quota()           from public, anon;
revoke execute on function public.accept_privacy(text)  from public, anon;
revoke execute on function public.consume_download()    from public, anon;
revoke execute on function public.delete_my_account()   from public, anon;
revoke execute on function public.email_key(text)       from public, anon, authenticated;

grant execute on function public.get_quota()          to authenticated;
grant execute on function public.accept_privacy(text) to authenticated;
grant execute on function public.consume_download()   to authenticated;
grant execute on function public.delete_my_account()  to authenticated;

-- ---------- retention (needed for the 24-month promise in the policy) --
-- 1) Supabase → Database → Extensions → enable "pg_cron".
-- 2) Then run this line once:
-- select cron.schedule('stamp-purge-free-usage', '15 3 * * *',
--   $$ delete from public.free_usage where updated_at < now() - interval '24 months' $$);

-- ---------- making someone Pro by hand (until payments are connected) --
-- update public.profiles set is_pro = true, pro_until = now() + interval '1 month'
--   where id = (select id from auth.users where email = 'client@example.com');
