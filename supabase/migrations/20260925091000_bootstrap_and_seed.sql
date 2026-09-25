-- ════════════════════════════════════════════════════════════════════════════
-- ShilpKala — FULL DATABASE BOOTSTRAP + DEMO SEED (paste into Supabase SQL Editor)
-- ════════════════════════════════════════════════════════════════════════════
-- Creates every table the backend needs (public schema), wires auth signup,
-- enables RLS, and inserts the same demo data as backend/seed_demo_data.py.
-- Idempotent: safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── 1. Artisans ─────────────────────────────────────────────────────────────
create table if not exists public.artisans (
    id                    text primary key,
    user_id               uuid unique,
    name                  text not null,
    phone                 text,
    craft_type            text,
    craft_type_key        text,
    location              text,
    artisan_id_status     text default 'Pending',
    government_id_status  text,
    role                  text default 'artisan',
    profile_image_url     text,
    is_profile_complete   boolean default false,
    created_at            timestamptz default now(),
    updated_at            timestamptz default now()
);

-- ── 2. Products (full Phase-1-audited schema) ───────────────────────────────
create table if not exists public.products (
    id                      text primary key,
    artisan_id              text,
    craft_type_id           text,
    source_language         text,
    title_hindi             text,
    title_english           text,
    title_key               text,
    description_hindi       text,
    description_english     text,
    description_key         text,
    price                   double precision default 0,
    suggested_price_min     double precision,
    suggested_price_max     double precision,
    material_cost           double precision,
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

-- ── 3. Listings ─────────────────────────────────────────────────────────────
create table if not exists public.listings (
    id                   text primary key,
    product_id           text,
    platform             text,
    external_listing_id  text,
    status               text,
    price                double precision default 0,
    sync_status          text default 'synced',
    created_at           timestamp default now(),
    updated_at           timestamp default now()
);

-- ── 4. Role registry (auth.users ↔ exactly one role) ────────────────────────
create table if not exists public.profiles (
    user_id      uuid primary key,
    role         text not null check (role in ('artisan', 'buyer')),
    display_name text,
    created_at   timestamptz default now(),
    updated_at   timestamptz default now()
);

-- ── 5. Buyers ───────────────────────────────────────────────────────────────
create table if not exists public.buyers (
    id                  text primary key,
    user_id             uuid unique,
    company_name        text,
    buyer_type          text check (buyer_type is null or buyer_type in (
                            'Retailer', 'Exporter', 'Wholesaler', 'Government Procurement')),
    country             text,
    contact_person_name text,
    created_at          timestamptz default now(),
    updated_at          timestamptz default now()
);

-- ── 6. Constraints & indexes ────────────────────────────────────────────────
do $$
begin
    -- products.artisan_id → artisans.id, RESTRICT, NOT NULL
    if not exists (select 1 from pg_constraint where conname = 'products_artisan_id_fkey') then
        alter table public.products
            add constraint products_artisan_id_fkey
            foreign key (artisan_id) references public.artisans (id) on delete restrict;
    end if;
    -- auth.users links (auth schema always exists on Supabase)
    if not exists (select 1 from pg_constraint where conname = 'profiles_user_id_fkey') then
        alter table public.profiles add constraint profiles_user_id_fkey
            foreign key (user_id) references auth.users (id) on delete cascade;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'buyers_user_id_fkey') then
        alter table public.buyers add constraint buyers_user_id_fkey
            foreign key (user_id) references auth.users (id) on delete cascade;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'artisans_user_id_fkey') then
        alter table public.artisans add constraint artisans_user_id_fkey
            foreign key (user_id) references auth.users (id) on delete cascade;
    end if;
end $$;

create index if not exists ix_products_artisan_id on public.products (artisan_id);
create index if not exists ix_products_status     on public.products (status);
create index if not exists ix_artisans_user_id    on public.artisans (user_id);

-- ── 7. Signup trigger: every new auth user gets exactly one role + profile ──
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_role  text := nullif(trim(coalesce(new.raw_user_meta_data->>'role', '')), '');
    v_name  text := nullif(trim(coalesce(new.raw_user_meta_data->>'name', '')), '');
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
        insert into public.artisans (id, user_id, name, phone, craft_type, location,
                                     government_id_status, role, is_profile_complete)
        values (v_new_id, new.id, coalesce(v_name, 'Artisan'), new.phone,
                nullif(trim(coalesce(new.raw_user_meta_data->>'craft_type', '')), ''),
                nullif(trim(coalesce(new.raw_user_meta_data->>'location', '')), ''),
                'Pending', 'artisan', false)
        on conflict (id) do update set user_id = excluded.user_id;
    else
        insert into public.buyers (id, user_id, company_name, buyer_type, country, contact_person_name)
        values (v_new_id, new.id,
                nullif(trim(coalesce(new.raw_user_meta_data->>'company_name', '')), ''),
                nullif(trim(coalesce(new.raw_user_meta_data->>'buyer_type', '')), ''),
                nullif(trim(coalesce(new.raw_user_meta_data->>'country', '')), ''),
                v_name)
        on conflict (id) do update set user_id = excluded.user_id;
    end if;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ── 8. Backfill profiles for users created BEFORE this trigger existed ──────
insert into public.profiles (user_id, role, display_name)
select u.id,
       coalesce(nullif(u.raw_user_meta_data->>'role', ''), 'artisan'),
       coalesce(nullif(u.raw_user_meta_data->>'name', ''), u.email)
from auth.users u
on conflict (user_id) do nothing;

-- ── 9. DEMO SEED (matches backend/seed_demo_data.py) ────────────────────────
insert into public.artisans (id, name, phone, craft_type, craft_type_key, location,
                             government_id_status, artisan_id_status, role, is_profile_complete)
values
    ('artisan-123', 'राम निवास (Ram Niwas)', '+919876543210', 'Handloom Weaving',
     'craft.handloom.label', 'Varanasi, Uttar Pradesh', 'Verified', 'Verified', 'artisan', true),
    ('artisan-456', 'मीरा देवी (Meera Devi)', '+919812345678', 'Clay Pottery',
     'craft.pottery.label', 'Jaipur, Rajasthan', 'Pending', 'Pending', 'artisan', true)
on conflict (id) do nothing;

-- Link the REAL Supabase auth users created via the Admin API to their profiles.
update public.artisans
   set user_id = (select id from auth.users where email = 'artisan@demo.shilpkala.test')
 where id = 'artisan-123' and user_id is null
   and exists (select 1 from auth.users where email = 'artisan@demo.shilpkala.test');

insert into public.products (
    id, artisan_id, craft_type_id, source_language,
    title_hindi, title_english,
    description_hindi, description_english,
    price, suggested_price_min, suggested_price_max, material_cost, status,
    is_gi_certified, gi_reg_number, gi_name_hindi, gi_name_english,
    heritage_story_hindi, heritage_story_english,
    image_url, before_image_url, after_image_url,
    keywords_raw, inquiry_count, views_count
)
values
    ('prod-seed-saree-01', 'artisan-123', '1', 'hi-IN',
     'बनारसी रेशमी साड़ी — हाथ से बुनी हुई', 'Banarasi Silk Saree — Handwoven',
     'काशी के प्रसिद्ध बुनकरों द्वारा हाथ से बुनी गई शुद्ध रेशमी साड़ी, पारंपरिक ज़री बुनाई के साथ।',
     'Pure silk handwoven by Varanasi''s master weavers with traditional zari work.',
     12500, 9800, 15400, 7200, 'live',
     true, 'GI-BR-117', 'बनारसी ब्रोकेड', 'Banaras Brocades & Sarees',
     '500 साल पुरानी बुनाई परंपरा, पीढ़ियों से चली आ रही है।',
     'A 500-year-old weaving tradition passed down through generations.',
     'http://localhost:8000/uploads/enhanced/0e8bc5aa733c_studio_white.jpg',
     'http://localhost:8000/uploads/originals/0e8bc5aa733c_orig_saree.jpg',
     'http://localhost:8000/uploads/enhanced/0e8bc5aa733c_studio_white.jpg',
     '["banarasi","silk saree","handwoven","varanasi","gi certified"]', 7, 142),

    ('prod-seed-pot-02', 'artisan-456', '2', 'hi-IN',
     'नीलमाता हस्तनिर्मित मिट्टी का घड़ा', 'Neelamata Handmade Clay Pot',
     'राजस्थानी मिट्टी से हाथ से तराशा गया पारंपरिक घड़ा, प्राकृतिक रंगों में रंगा हुआ।',
     'Traditional pot hand-thrown from Rajasthani clay, finished in natural dyes.',
     1850, 1400, 2600, 900, 'live',
     false, null, null, null,
     'खुर्जा की मिट्टी की परंपरा, जो सदियों पुरानी है।',
     'The Khurja pottery tradition, centuries in the making.',
     'http://localhost:8000/uploads/enhanced/0ef060777916_studio_white.jpg',
     'http://localhost:8000/uploads/originals/0ef060777916_orig_pot.jpg',
     'http://localhost:8000/uploads/enhanced/0ef060777916_studio_white.jpg',
     '["clay pot","khurja pottery","handmade","rajasthan"]', 3, 63),

    ('prod-seed-blockprint-03', 'artisan-123', '3', 'hi-IN',
     'बाग हैंड ब्लॉक प्रिंट स्कार्फ', 'Bagh Hand Block Print Scarf',
     'प्राकृतिक रंगों और हाथ की नक्काशी वाले ब्लॉक से छपा सूती स्कार्फ।',
     'Cotton scarf printed with natural dyes and hand-carved blocks.',
     2400, 1800, 3200, 1100, 'live',
     true, 'GI-MP-042', null, 'Bagh Prints of Madhya Pradesh',
     null, 'Bagh village''s 400-year-old block-printing craft on the banks of the Bagh river.',
     'http://localhost:8000/uploads/enhanced/01ddc6ed051c_studio_white.jpg',
     'http://localhost:8000/uploads/originals/01ddc6ed051c_orig_textile.jpg',
     'http://localhost:8000/uploads/enhanced/01ddc6ed051c_studio_white.jpg',
     '["bagh print","block print","natural dye","cotton"]', 5, 89),

    ('prod-seed-wood-04', 'artisan-456', '4', 'hi-IN',
     'शीशम लकड़ी की नक्काशीदार मुर्ति', 'Sheesham Wood Carved Figurine',
     'सहारनपुर की प्रसिद्ध लकड़ी की नक्काशी कला से बनी मुर्ति।',
     'Figurine carved in Saharanpur''s famed wood-carving style.',
     4200, 3200, 5800, 2100, 'draft',
     false, null, null, null,
     null, 'Saharanpur wood carving, a GI-recognised craft of Uttar Pradesh.',
     'http://localhost:8000/uploads/enhanced/0ef060777916_studio_white.jpg',
     'http://localhost:8000/uploads/originals/0ef060777916_orig_pot.jpg',
     'http://localhost:8000/uploads/enhanced/0ef060777916_studio_white.jpg',
     '["sheesham wood","saharanpur","carving","handmade"]', 1, 21),

    ('prod-seed-zardozi-05', 'artisan-123', '5', 'hi-IN',
     'ज़रदोज़ी कढ़ाई वाला कुशन कवर', 'Zardozi Embroidered Cushion Cover',
     'स्वर्ण और रज्जु के धागों से की गई शाही ज़रदोज़ी कढ़ाई।',
     'Royal zardozi embroidery in gold and silver thread.',
     3200, 2400, 4400, 1600, 'live',
     true, 'GI-UP-071', null, 'Lucknawi Zardozi',
     null, 'Brought to Lucknow in the Mughal era; patronised by the Nawabs.',
     'http://localhost:8000/uploads/enhanced/158578479d52_studio_white.jpg',
     'http://localhost:8000/uploads/originals/158578479d52_photo.jpg',
     'http://localhost:8000/uploads/enhanced/158578479d52_studio_white.jpg',
     '["zardozi","embroidery","lucknow","gold thread"]', 12, 210),

    ('prod-seed-brass-06', 'artisan-456', '6', 'hi-IN',
     'मोरदान हस्तनिर्मित पीतल का दीया', 'Handcrafted Brass Moradabad Diya',
     'मुरादाबाद की प्रसिद्ध पीतल कारीगरी से बना दीया।',
     'Diya crafted in Moradabad''s renowned brass work.',
     950, 700, 1300, 450, 'live',
     false, null, null, null,
     null, 'Moradabad — the ''Brass City'' of India — has crafted brassware since the 1600s.',
     'http://localhost:8000/uploads/enhanced/0d76869e5df8_studio_white.jpg',
     'http://localhost:8000/uploads/originals/0d76869e5df8_photo.jpg',
     'http://localhost:8000/uploads/enhanced/0d76869e5df8_studio_white.jpg',
     '["brass diya","moradabad","metalwork","festive"]', 2, 54)
on conflict (id) do nothing;

insert into public.buyers (id, user_id, company_name, buyer_type, country, contact_person_name)
values
    ('buyer-seed-01', (select id from auth.users where email = 'buyer@demo.shilpkala.test'),
     'Global Handicrafts Trading LLC', 'Exporter', 'United Arab Emirates', 'Omar Al Farsi'),
    ('buyer-seed-02', null,
     'Cottage Emporium Retail', 'Retailer', 'India', 'Priya Sharma')
on conflict (id) do nothing;

-- ── 10. Row Level Security (self-only; backend's postgres role bypasses) ────
alter table public.profiles enable row level security;
alter table public.artisans enable row level security;
alter table public.buyers   enable row level security;
alter table public.products enable row level security;

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

-- Products are publicly readable (the buyer catalog), writable by their owner.
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
    for select using (true);

-- ── 11. Verify ──────────────────────────────────────────────────────────────
select 'artisans' as table_name, count(*) as rows from public.artisans
union all select 'products', count(*) from public.products
union all select 'listings', count(*) from public.listings
union all select 'profiles', count(*) from public.profiles
union all select 'buyers',   count(*) from public.buyers;
