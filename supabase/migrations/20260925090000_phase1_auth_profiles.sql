-- ════════════════════════════════════════════════════════════════════════════
-- ShilpKala Phase 1 — Auth & Role Profiles
-- ════════════════════════════════════════════════════════════════════════════
-- Two distinct roles: 'artisan' and 'buyer'. Every authenticated user gets
-- EXACTLY ONE role, decided and stored at signup (never inferred later, never
-- left ambiguous).
--
-- Design:
--   * public.profiles      → the single, authoritative role registry. PK is the
--                            Supabase auth.users id. This is what the FastAPI
--                            JWT middleware reads to decide artisan vs buyer.
--   * public.artisans      → artisan detail profile (existing app table, now
--                            linked to auth.users + carrying the spec's
--                            government_id_status).
--   * public.buyers        → buyer detail profile (new).
--
-- NOTE: the auth.users references are wrapped so this file is safe to run on a
-- plain Postgres instance that has no `auth` schema (e.g. local dev Postgres),
-- while still being a real FK on Supabase.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── 1. Authoritative role registry ──────────────────────────────────────────
create table if not exists public.profiles (
    user_id      uuid primary key,
    role         text not null check (role in ('artisan', 'buyer')),
    display_name text,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

comment on table  public.profiles is
    'Single authoritative role registry. Exactly one role per authenticated user.';
comment on column public.profiles.role is
    'artisan | buyer — decided at signup from raw_user_meta_data.role and enforced by CHECK.';

-- ── 2. Buyers detail profile ────────────────────────────────────────────────
create table if not exists public.buyers (
    id                text primary key,
    user_id           uuid unique,
    company_name      text,
    buyer_type        text check (
                          buyer_type is null or buyer_type in (
                              'Retailer', 'Exporter', 'Wholesaler', 'Government Procurement'
                          )
                      ),
    country           text,
    contact_person_name text,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

comment on table public.buyers is
    'Buyer-side detail profile, one row per buyer-role authenticated user.';

-- ── 3. Artisan auth linkage + spec-named government_id_status ───────────────
-- The existing app table is `artisans` (id, name, phone, craft_type, location,
-- artisan_id_status, ...). We add the auth linkage and the spec-required
-- `government_id_status` without dropping the legacy column, then backfill.
alter table public.artisans add column if not exists user_id uuid;
alter table public.artisans add column if not exists government_id_status text;
alter table public.artisans add column if not exists role text default 'artisan';

-- Backfill: legacy artisan_id_status (Verified/Pending/None) → government_id_status
update public.artisans
   set government_id_status = artisan_id_status
 where government_id_status is null
   and artisan_id_status is not null;

-- Unique link (one artisan profile per auth user) — only if no duplicates exist.
do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'artisans_user_id_key'
    ) then
        begin
            alter table public.artisans add constraint artisans_user_id_key unique (user_id);
        exception when others then
            raise notice 'Skipped artisans_user_id unique (duplicate/null user_id rows present)';
        end;
    end if;
end $$;

-- ── 4. Real FKs to auth.users when the Supabase auth schema is present ──────
do $$
begin
    if exists (select 1 from information_schema.schemata where schema_name = 'auth') then
        -- profiles.user_id → auth.users.id
        if not exists (select 1 from pg_constraint where conname = 'profiles_user_id_fkey') then
            alter table public.profiles
                add constraint profiles_user_id_fkey
                foreign key (user_id) references auth.users (id) on delete cascade;
        end if;

        -- buyers.user_id → auth.users.id
        if not exists (select 1 from pg_constraint where conname = 'buyers_user_id_fkey') then
            alter table public.buyers
                add constraint buyers_user_id_fkey
                foreign key (user_id) references auth.users (id) on delete cascade;
        end if;

        -- artisans.user_id → auth.users.id
        if not exists (select 1 from pg_constraint where conname = 'artisans_user_id_fkey') then
            alter table public.artisans
                add constraint artisans_user_id_fkey
                foreign key (user_id) references auth.users (id) on delete cascade;
        end if;
    else
        raise notice 'No auth schema found — skipping auth.users FKs (non-Supabase run).';
    end if;
end $$;

-- ── 5. Signup trigger: create the role row + detail profile atomically ──────
-- Role comes from raw_user_meta_data.role ('artisan' | 'buyer'). If it is
-- missing or invalid we RAISE, which fails the signup — deliberately making it
-- impossible to create a user with an ambiguous or absent role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_role text := nullif(trim(coalesce(new.raw_user_meta_data->>'role', '')), '');
    v_name text := nullif(trim(coalesce(new.raw_user_meta_data->>'name', '')), '');
    v_new_id text;
begin
    if v_role is null or v_role not in ('artisan', 'buyer') then
        raise exception
            'Signup rejected: raw_user_meta_data.role must be ''artisan'' or ''buyer'' (got: %)', v_role
            using errcode = 'check_violation';
    end if;

    insert into public.profiles (user_id, role, display_name)
    values (new.id, v_role, v_name)
    on conflict (user_id) do update set role = excluded.role, updated_at = now();

    v_new_id := coalesce(
        nullif(trim(coalesce(new.raw_user_meta_data->>'profile_id', '')), ''),
        v_role || '-' || replace(new.id::text, '-', '')
    );

    if v_role = 'artisan' then
        insert into public.artisans (id, user_id, name, phone, craft_type, location, government_id_status, role, is_profile_complete)
        values (
            v_new_id,
            new.id,
            coalesce(v_name, 'Artisan'),
            new.phone,
            nullif(trim(coalesce(new.raw_user_meta_data->>'craft_type', '')), ''),
            nullif(trim(coalesce(new.raw_user_meta_data->>'location', '')), ''),
            'Pending',
            'artisan',
            false
        )
        on conflict (id) do update set user_id = excluded.user_id;
    else
        insert into public.buyers (id, user_id, company_name, buyer_type, country, contact_person_name)
        values (
            v_new_id,
            new.id,
            nullif(trim(coalesce(new.raw_user_meta_data->>'company_name', '')), ''),
            nullif(trim(coalesce(new.raw_user_meta_data->>'buyer_type', '')), ''),
            nullif(trim(coalesce(new.raw_user_meta_data->>'country', '')), ''),
            v_name
        )
        on conflict (id) do update set user_id = excluded.user_id;
    end if;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ── 6. Row Level Security ───────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.artisans enable row level security;
alter table public.buyers   enable row level security;

-- Users may read/update only their own rows. (The FastAPI backend connects as
-- the Postgres service role and bypasses RLS for server-side operations.)
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
    for select using (auth.uid() = user_id);
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
    for update using (auth.uid() = user_id);

drop policy if exists artisans_self_all on public.artisans;
create policy artisans_self_all on public.artisans
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists buyers_self_all on public.buyers;
create policy buyers_self_all on public.buyers
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
