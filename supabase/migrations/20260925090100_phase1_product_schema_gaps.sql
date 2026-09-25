-- ════════════════════════════════════════════════════════════════════════════
-- ShilpKala Phase 1 — Product Schema Gap Closure (from the Phase 1 audit)
-- ════════════════════════════════════════════════════════════════════════════
-- The backend's SQLAlchemy `Base.metadata.create_all()` creates the base
-- `products` table on first connect, so this migration is written defensively:
-- it CREATEs the reconciled table if absent, then idempotently ALTERs any
-- pre-existing table with the gaps the audit found:
--
--   MISSING → suggested_price_min / suggested_price_max   (AI price range)
--   MISSING → material_cost                               (artisan-entered)
--   MISSING → source_language                             (language created in)
--   NOT ENFORCED → products.artisan_id FK + NOT NULL
--
-- Already present and confirmed: title_hindi/title_english, description_*,
-- price, craft_type_id, is_gi_certified, gi_reg_number, gi_name_*,
-- heritage_story_*, keywords_raw, status, created_at, updated_at,
-- image_url / before_image_url / after_image_url (original + enhanced).
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Base table if the backend has not connected yet ──────────────────────
create table if not exists public.products (
    id                      text primary key,
    artisan_id              text,
    craft_type_id           text,
    title_hindi             text,
    title_english           text,
    title_key               text,
    description_hindi       text,
    description_english     text,
    description_key         text,
    price                   double precision default 0,
    status                  text default 'live',
    is_gi_certified         boolean default false,
    gi_reg_number           text,
    gi_name_hindi           text,
    gi_name_english         text,
    heritage_story_hindi    text,
    heritage_story_english  text,
    heritage_story_key      text,
    image_url               text,
    before_image_url        text,
    after_image_url         text,
    inquiry_count           integer default 0,
    views_count             integer default 0,
    keywords_raw            text default '[]',
    created_at              timestamp default now(),
    updated_at              timestamp default now()
);

-- ── 2. Audit gaps — idempotent ──────────────────────────────────────────────
alter table public.products add column if not exists suggested_price_min double precision;
alter table public.products add column if not exists suggested_price_max double precision;
alter table public.products add column if not exists material_cost       double precision;
alter table public.products add column if not exists source_language     text;

comment on column public.products.price               is
    'The artisan''s FINAL chosen price (what the listing is published at).';
comment on column public.products.suggested_price_min is
    'Lower bound of the AI-suggested price range (POST /api/pricing/suggest).';
comment on column public.products.suggested_price_max is
    'Upper bound of the AI-suggested price range (POST /api/pricing/suggest).';
comment on column public.products.material_cost       is
    'Artisan-entered material/input cost, used to sanity-check the suggested band.';
comment on column public.products.source_language     is
    'BCP-47-ish language the listing was originally dictated/created in, e.g. hi-IN.';
comment on column public.products.status              is
    'live | draft | archived';

-- ── 3. Enforce artisan_id as a real, non-optional foreign key ───────────────
-- Backfill any orphan products to the first known artisan so the NOT NULL can
-- be applied. If there is no artisan to point at, we leave artisan_id nullable
-- and raise a loud notice instead of silently dropping the constraint.
do $$
declare
    v_orphans   integer;
    v_artisan   text;
    v_nullable  text;
begin
    select count(*) into v_orphans from public.products where artisan_id is null;

    if v_orphans > 0 then
        select id into v_artisan from public.artisans order by created_at nulls last limit 1;
        if v_artisan is not null then
            update public.products set artisan_id = v_artisan where artisan_id is null;
            raise notice 'Backfilled % orphan product(s) to artisan %', v_orphans, v_artisan;
        else
            raise notice 'NOT NULL not applied: % product(s) have NULL artisan_id and no artisan exists to backfill from.', v_orphans;
        end if;
    end if;

    select is_nullable into v_nullable
      from information_schema.columns
     where table_schema = 'public' and table_name = 'products' and column_name = 'artisan_id';

    if v_nullable <> 'NO' then
        begin
            alter table public.products alter column artisan_id set not null;
        exception when others then
            raise notice 'Could not set products.artisan_id NOT NULL: %', sqlerrm;
        end;
    end if;
end $$;

-- FK → artisans.id (ON DELETE RESTRICT: don't let a listing outlive its artisan)
do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'products_artisan_id_fkey') then
        begin
            alter table public.products
                add constraint products_artisan_id_fkey
                foreign key (artisan_id) references public.artisans (id) on delete restrict;
        exception when others then
            raise notice 'Could not add products_artisan_id_fkey: %', sqlerrm;
        end;
    end if;
end $$;

create index if not exists ix_products_artisan_id on public.products (artisan_id);
create index if not exists ix_products_status     on public.products (status);
