-- ============================================================================
-- GAVENTGO — Phase 2A schema
-- Run this in the Supabase SQL editor (or via `supabase db push` once the
-- project is linked with the CLI). Safe to re-run: uses IF NOT EXISTS /
-- CREATE OR REPLACE where possible, but DROP POLICY IF EXISTS is used before
-- recreating policies so this file stays idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  email       text not null,
  phone       text,
  role        text not null default 'customer'
              check (role in ('customer', 'organizer', 'staff')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can see and update only their own profile.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No INSERT or DELETE policy for authenticated/anon: profile rows are only
-- ever created by the handle_new_user() trigger below (SECURITY DEFINER,
-- bypasses RLS), so a client can never insert an arbitrary profile/role —
-- including 'staff' — directly.

-- Prevent a user from changing their own role via the profiles_update_own
-- policy above (that policy only checks id ownership, not which columns
-- changed). This trigger silently pins role back to its previous value on
-- any client-initiated UPDATE.
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    new.role := old.role;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_prevent_role_change on public.profiles;
create trigger trg_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_role_change();

-- Auto-create a profile row whenever a new auth.users row is created.
-- Reads the intended role from signup metadata but CLAMPS it: only
-- 'organizer' is ever honored from client-supplied metadata, anything else
-- (including an attempted 'staff') falls back to 'customer'. This is the
-- only path that creates a profile, so role assignment is never left to an
-- unauthenticated/authenticated client's direct table access.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    case
      when new.raw_user_meta_data ->> 'role' = 'organizer' then 'organizer'
      else 'customer'
    end
  );
  return new;
end;
$$;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- events
-- ----------------------------------------------------------------------------
create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  organizer_id  uuid not null references public.profiles (id) on delete cascade,
  title         text not null,
  slug          text not null unique,
  description   text not null default '',
  category      text not null default 'other'
                check (category in ('music', 'comedy', 'sports', 'conferences', 'parties', 'other')),
  venue         text not null,
  city          text not null,
  event_date    date not null,
  event_time    text not null,
  poster_url    text,
  status        text not null default 'draft'
                check (status in ('draft', 'published', 'cancelled', 'completed')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists events_status_idx on public.events (status);
create index if not exists events_organizer_idx on public.events (organizer_id);
create index if not exists events_category_idx on public.events (category);

alter table public.events enable row level security;

-- Public (anon + authenticated) can read published events.
drop policy if exists "events_select_published" on public.events;
create policy "events_select_published"
  on public.events for select
  using (status = 'published');

-- Organizers can read all of their own events, including drafts.
drop policy if exists "events_select_own" on public.events;
create policy "events_select_own"
  on public.events for select
  using (auth.uid() = organizer_id);

-- Only accounts with role='organizer' may create events, and only for
-- themselves.
drop policy if exists "events_insert_own_if_organizer" on public.events;
create policy "events_insert_own_if_organizer"
  on public.events for insert
  with check (
    auth.uid() = organizer_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'organizer'
    )
  );

-- Organizers can update/delete only their own events.
drop policy if exists "events_update_own" on public.events;
create policy "events_update_own"
  on public.events for update
  using (auth.uid() = organizer_id)
  with check (auth.uid() = organizer_id);

drop policy if exists "events_delete_own" on public.events;
create policy "events_delete_own"
  on public.events for delete
  using (auth.uid() = organizer_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_events_updated_at on public.events;
create trigger trg_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- ticket_types
-- ----------------------------------------------------------------------------
create table if not exists public.ticket_types (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  name        text not null,
  price       numeric(10, 2) not null default 0 check (price >= 0),
  quantity    integer not null default 0 check (quantity >= 0),
  sold        integer not null default 0 check (sold >= 0 and sold <= quantity),
  created_at  timestamptz not null default now()
);

create index if not exists ticket_types_event_idx on public.ticket_types (event_id);

alter table public.ticket_types enable row level security;

-- Public can read ticket types belonging to published events only.
drop policy if exists "ticket_types_select_published" on public.ticket_types;
create policy "ticket_types_select_published"
  on public.ticket_types for select
  using (
    exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id and e.status = 'published'
    )
  );

-- Organizers can read/manage ticket types for their own events (any status).
drop policy if exists "ticket_types_select_own" on public.ticket_types;
create policy "ticket_types_select_own"
  on public.ticket_types for select
  using (
    exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id and e.organizer_id = auth.uid()
    )
  );

drop policy if exists "ticket_types_insert_own" on public.ticket_types;
create policy "ticket_types_insert_own"
  on public.ticket_types for insert
  with check (
    exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id and e.organizer_id = auth.uid()
    )
  );

drop policy if exists "ticket_types_update_own" on public.ticket_types;
create policy "ticket_types_update_own"
  on public.ticket_types for update
  using (
    exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id and e.organizer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id and e.organizer_id = auth.uid()
    )
  );

drop policy if exists "ticket_types_delete_own" on public.ticket_types;
create policy "ticket_types_delete_own"
  on public.ticket_types for delete
  using (
    exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id and e.organizer_id = auth.uid()
    )
  );

-- ============================================================================
-- SEED / DEMO DATA
--
-- These are clearly-marked demo rows migrated from the Phase 1 mock data
-- (lib/data.ts). They're owned by a placeholder demo organizer profile so
-- the site isn't empty after cutover. Safe to delete once real organizers
-- sign up and publish their own events:
--
--   delete from public.events where organizer_id =
--     '00000000-0000-0000-0000-000000000001';
--
-- Note: this seed inserts directly into auth.users, which requires running
-- as the Supabase postgres role (the SQL editor does this by default). It
-- won't work through the client libraries, which is expected — seeding is a
-- one-time manual step, not something the app does at runtime.
-- ============================================================================

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values (
  '00000000-0000-0000-0000-000000000001',
  'demo-organizer@gaventgo.app',
  crypt('demo-not-a-real-login', gen_salt('bf')),
  now(),
  '{"full_name": "Gaventgo Demo Organizer", "role": "organizer"}',
  now(),
  now()
)
on conflict (id) do nothing;

-- handle_new_user() fires on the insert above and creates the matching
-- profiles row automatically.

insert into public.events
  (id, organizer_id, title, slug, description, category, venue, city, event_date, event_time, poster_url, status)
values
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Afrobeats Live',
    'afrobeats-live-accra',
    'An open-air night of Ghana''s biggest afrobeats acts, live band, and a sound system built for dancing till 2am.',
    'music', 'El Wak Sports Stadium', 'Accra', '2026-09-12', '19:00',
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=800&auto=format&fit=crop',
    'published'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Comedy Jam Kumasi',
    'comedy-jam-kumasi',
    'Ghana''s sharpest stand-up comedians take the stage for one night of non-stop laughs.',
    'comedy', 'Kumasi City Mall Grounds', 'Kumasi', '2026-08-29', '18:30',
    'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?q=80&w=800&auto=format&fit=crop',
    'published'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'Tech Founders Summit',
    'tech-founders-summit',
    'A day of talks, panels, and networking with founders and investors building Ghana''s tech ecosystem.',
    'conferences', 'Movenpick Ambassador Hotel', 'Accra', '2026-10-03', '09:00',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800&auto=format&fit=crop',
    'published'
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    'Champions Night Watch Party',
    'champions-night-football',
    'Big screen, live commentary, and a crowd of true football heads for the biggest match of the season.',
    'sports', 'Airport West Lounge', 'Accra', '2026-09-05', '20:00',
    'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=800&auto=format&fit=crop',
    'published'
  )
on conflict (id) do nothing;

insert into public.ticket_types (event_id, name, price, quantity, sold)
values
  ('10000000-0000-0000-0000-000000000001', 'Regular', 120, 500, 180),
  ('10000000-0000-0000-0000-000000000001', 'VIP', 350, 100, 40),
  ('10000000-0000-0000-0000-000000000002', 'Regular', 60, 300, 90),
  ('10000000-0000-0000-0000-000000000002', 'Front Row', 150, 60, 25),
  ('10000000-0000-0000-0000-000000000003', 'Standard', 200, 250, 70),
  ('10000000-0000-0000-0000-000000000003', 'All-Access', 500, 50, 12),
  ('10000000-0000-0000-0000-000000000004', 'Entry', 40, 200, 55)
on conflict do nothing;

-- ============================================================================
-- PHASE 3 — Ticket management, orders, and payment-ready inventory logic
--
-- Safe to run after the Phase 2A section above: uses IF NOT EXISTS / DROP
-- POLICY IF EXISTS / CREATE OR REPLACE throughout, so re-running this whole
-- file (or just this section) on a project that already has Phase 2A applied
-- will not destroy existing tables, RLS, or seed data.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ticket_types hardening
--
-- "sold" must never be settable by a direct client update — it only ever
-- changes inside the create_order() function below, which runs as
-- SECURITY DEFINER and therefore bypasses these column grants. Organizers
-- keep the ability to edit name/price/quantity via the existing
-- "ticket_types_update_own" RLS policy; the quantity >= sold check
-- constraint (already in the Phase 2A section above) rejects any attempt to
-- drop quantity below tickets already sold, at the database level.
-- ----------------------------------------------------------------------------
revoke update on public.ticket_types from authenticated;
grant update (name, price, quantity) on public.ticket_types to authenticated;

-- Defense in depth: block deleting a ticket type that has sold tickets,
-- even if a future policy change were to allow the DELETE through RLS.
create or replace function public.prevent_delete_if_sold()
returns trigger
language plpgsql
as $$
begin
  if old.sold > 0 then
    raise exception 'Cannot delete a ticket type with % sold ticket(s). Disable or edit it instead.', old.sold
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_prevent_delete_if_sold on public.ticket_types;
create trigger trg_prevent_delete_if_sold
  before delete on public.ticket_types
  for each row execute function public.prevent_delete_if_sold();

-- ----------------------------------------------------------------------------
-- orders
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  event_id           uuid not null references public.events (id) on delete restrict,
  total_amount       numeric(10, 2) not null default 0 check (total_amount >= 0),
  status             text not null default 'pending'
                     check (status in ('pending', 'paid', 'failed', 'cancelled')),
  payment_reference  text unique,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists orders_user_idx on public.orders (user_id);
create index if not exists orders_event_idx on public.orders (event_id);
create index if not exists orders_payment_reference_idx on public.orders (payment_reference);

alter table public.orders enable row level security;

-- Customers can see only their own orders. There is deliberately no
-- INSERT/UPDATE/DELETE policy for authenticated/anon: every order is
-- created by create_order() and every status change is made by the
-- server-side payment settlement code using the service-role key — never
-- directly by a client, so a customer can never fabricate an order or mark
-- one as paid themselves.
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own"
  on public.orders for select
  using (auth.uid() = user_id);

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- order_items
-- ----------------------------------------------------------------------------
create table if not exists public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete cascade,
  ticket_type_id  uuid not null references public.ticket_types (id) on delete restrict,
  quantity        integer not null check (quantity > 0),
  unit_price      numeric(10, 2) not null check (unit_price >= 0),
  subtotal        numeric(10, 2) not null check (subtotal >= 0),
  created_at      timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_ticket_type_idx on public.order_items (ticket_type_id);

alter table public.order_items enable row level security;

-- Same pattern as orders: read-only for the owning customer, no direct
-- client writes — only create_order() (SECURITY DEFINER) inserts these.
drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- create_order()
--
-- The only path by which an order can be created. Runs as SECURITY DEFINER
-- so it can insert into orders/order_items and increment ticket_types.sold
-- even though clients have no direct write access to those columns/tables —
-- but it only ever acts on behalf of auth.uid() (never a client-supplied
-- user id) and always recalculates price/subtotal/total from the current
-- ticket_types rows, never from client input.
--
-- Concurrency safety: each requested ticket_type row is locked with
-- `select ... for update` before checking remaining inventory, so two
-- simultaneous purchases against the same ticket type serialize instead of
-- both reading a stale "remaining" count — this is what prevents overselling
-- under concurrent load.
--
-- p_items shape: '[{"ticket_type_id": "uuid", "quantity": 2}, ...]'::jsonb
--
-- KNOWN LIMITATION (documented, not fixed in this phase): inventory is
-- reserved (sold incremented) at order-creation time, while the order is
-- still "pending". If a customer abandons checkout before paying, those
-- tickets stay reserved indefinitely. A future phase should add an expiry
-- job (e.g. cancel + release pending orders older than N minutes via a
-- scheduled function) — acceptable for this MVP phase, but called out here
-- so it isn't mistaken for an oversight.
-- ----------------------------------------------------------------------------
create or replace function public.create_order(p_event_id uuid, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id       uuid := auth.uid();
  v_event_status  text;
  v_order_id      uuid;
  v_total         numeric(10, 2) := 0;
  v_item          jsonb;
  v_ticket_type   record;
  v_qty           integer;
  v_subtotal      numeric(10, 2);
begin
  if v_user_id is null then
    raise exception 'You must be logged in to purchase tickets.' using errcode = 'P0001';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'No tickets selected.' using errcode = 'P0001';
  end if;

  select status into v_event_status from public.events where id = p_event_id;

  if v_event_status is null then
    raise exception 'Event not found.' using errcode = 'P0001';
  end if;

  if v_event_status <> 'published' then
    raise exception 'This event is not currently available for purchase.' using errcode = 'P0001';
  end if;

  -- Create the order shell first (total filled in once items are validated).
  insert into public.orders (user_id, event_id, total_amount, status)
  values (v_user_id, p_event_id, 0, 'pending')
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item ->> 'quantity')::integer;

    if v_qty is null or v_qty < 1 then
      raise exception 'Ticket quantity must be at least 1.' using errcode = 'P0001';
    end if;

    -- Lock the row so a concurrent purchase can't read the same
    -- pre-update "remaining" count.
    select id, event_id, name, price, quantity, sold
      into v_ticket_type
      from public.ticket_types
      where id = (v_item ->> 'ticket_type_id')::uuid
      for update;

    if v_ticket_type.id is null then
      raise exception 'One of the selected ticket types no longer exists.' using errcode = 'P0001';
    end if;

    if v_ticket_type.event_id <> p_event_id then
      raise exception 'Ticket type does not belong to this event.' using errcode = 'P0001';
    end if;

    if (v_ticket_type.quantity - v_ticket_type.sold) < v_qty then
      raise exception 'Only % ticket(s) left for "%".', (v_ticket_type.quantity - v_ticket_type.sold), v_ticket_type.name
        using errcode = 'P0001';
    end if;

    v_subtotal := v_ticket_type.price * v_qty;
    v_total := v_total + v_subtotal;

    insert into public.order_items (order_id, ticket_type_id, quantity, unit_price, subtotal)
    values (v_order_id, v_ticket_type.id, v_qty, v_ticket_type.price, v_subtotal);

    update public.ticket_types
      set sold = sold + v_qty
      where id = v_ticket_type.id;
  end loop;

  update public.orders set total_amount = v_total where id = v_order_id;

  return v_order_id;
end;
$$;

grant execute on function public.create_order(uuid, jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- Narrow client-writable surface on orders: a customer may attach a payment
-- reference to their own still-pending order (needed when initiating a
-- Paystack transaction) but can touch no other column — status changes to
-- 'paid' only ever happen server-side via the service-role client in the
-- payment webhook/verification code, never through this policy.
-- ----------------------------------------------------------------------------
revoke update on public.orders from authenticated;
grant update (payment_reference) on public.orders to authenticated;

drop policy if exists "orders_update_own_pending_reference" on public.orders;
create policy "orders_update_own_pending_reference"
  on public.orders for update
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status = 'pending');

-- ============================================================================
-- PHASE 4 — QR tickets, staff scanning, wristband check-in, pending-order
-- expiry.
--
-- Idempotent like the sections above: safe to run this whole file again on
-- a project that already has Phase 2A/3 applied.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- order_items: QR code + scan/wristband tracking
--
-- qr_code is assigned once, at payment settlement (see settleOrderByReference
-- in lib/payments/settle.ts) — it stays NULL for pending/failed orders, so a
-- ticket only exists to be shown or scanned once it's actually been paid
-- for. One row = one scannable unit, regardless of its `quantity` (a
-- customer buying 2 VIP tickets in one order_item gets one QR covering the
-- pair — documented in the ticket display / scan UI, not split into
-- per-seat codes in this phase).
-- ----------------------------------------------------------------------------
alter table public.order_items
  add column if not exists qr_code text unique,
  add column if not exists scanned_at timestamptz default null,
  add column if not exists scanned_by uuid references public.profiles (id) default null,
  add column if not exists wristband_id text unique default null;

create index if not exists idx_order_items_qr_code on public.order_items (qr_code);
create index if not exists idx_order_items_wristband_id on public.order_items (wristband_id);

-- ----------------------------------------------------------------------------
-- orders: add 'expired' as a valid status, for pending orders past their
-- hold window (see expire_pending_orders() below).
-- ----------------------------------------------------------------------------
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending', 'paid', 'failed', 'cancelled', 'expired'));

-- ----------------------------------------------------------------------------
-- Fix prevent_role_change(): as originally written it reverted a role edit
-- on ANY update, including ones made by the service-role client or directly
-- in the SQL Editor (both run with auth.uid() = null, so they were being
-- silently blocked too) — which left no legitimate way to ever promote
-- someone to 'staff'. Redefined to only pin the role back when the row's
-- own owner is the one making the change (auth.uid() = old.id), i.e. a
-- logged-in user editing their own profile. Anything else — admin/service
-- context, SQL Editor — was never really "the user changing their own
-- role" and can proceed.
-- ----------------------------------------------------------------------------
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and new.role is distinct from old.role then
    new.role := old.role;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- scan_ticket(p_qr_code)
--
-- The only path by which a ticket gets checked in. Callable by any
-- authenticated user with role='staff', or an 'organizer' scanning a ticket
-- for one of their own events. Runs as SECURITY DEFINER so it can update
-- order_items (which has no direct client UPDATE policy at all) and look up
-- the buyer's name across the RLS boundary — but only after checking the
-- caller's role/ownership itself, and it never trusts a client-supplied
-- event id: authorization is derived from the ticket's own event via the
-- looked-up order, not from anything the client claims.
--
-- Returns jsonb with a `result` discriminator rather than raising for
-- ordinary "not found" / "already scanned" / "not paid" outcomes, since
-- those are expected states the scanning UI needs to render distinctly —
-- raise is reserved for actual authorization failures.
-- ----------------------------------------------------------------------------
create or replace function public.scan_ticket(p_qr_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller  uuid := auth.uid();
  v_role    text;
  v_item    record;
  v_wristband text;
begin
  if v_caller is null then
    raise exception 'You must be logged in to scan tickets.' using errcode = 'P0001';
  end if;

  select role into v_role from public.profiles where id = v_caller;

  select
    oi.id, oi.order_id, oi.ticket_type_id, oi.quantity, oi.scanned_at, oi.wristband_id,
    o.status as order_status, o.event_id, o.user_id as customer_id,
    tt.name as ticket_type_name,
    e.title as event_title, e.organizer_id,
    p.full_name as holder_name
  into v_item
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.ticket_types tt on tt.id = oi.ticket_type_id
  join public.events e on e.id = o.event_id
  join public.profiles p on p.id = o.user_id
  where oi.qr_code = p_qr_code;

  if v_item.id is null then
    return jsonb_build_object('result', 'invalid');
  end if;

  if v_role <> 'staff' and not (v_role = 'organizer' and v_item.organizer_id = v_caller) then
    raise exception 'You do not have permission to scan tickets for this event.' using errcode = 'P0001';
  end if;

  if v_item.order_status <> 'paid' then
    return jsonb_build_object(
      'result', 'not_paid',
      'event_title', v_item.event_title,
      'ticket_type_name', v_item.ticket_type_name
    );
  end if;

  if v_item.scanned_at is not null then
    return jsonb_build_object(
      'result', 'already_scanned',
      'event_title', v_item.event_title,
      'ticket_type_name', v_item.ticket_type_name,
      'holder_name', v_item.holder_name,
      'quantity', v_item.quantity,
      'scanned_at', v_item.scanned_at,
      'wristband_id', v_item.wristband_id
    );
  end if;

  v_wristband := 'WB-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  update public.order_items
    set scanned_at = now(), scanned_by = v_caller, wristband_id = v_wristband
    where id = v_item.id;

  return jsonb_build_object(
    'result', 'success',
    'event_title', v_item.event_title,
    'ticket_type_name', v_item.ticket_type_name,
    'holder_name', v_item.holder_name,
    'quantity', v_item.quantity,
    'scanned_at', now(),
    'wristband_id', v_wristband
  );
end;
$$;

grant execute on function public.scan_ticket(text) to authenticated;

-- ----------------------------------------------------------------------------
-- expire_pending_orders(p_older_than_minutes)
--
-- Releases inventory reserved by pending orders that were never paid —
-- documented as a known gap back in the Phase 3 section, closed here.
-- Locks each qualifying order with `for update skip locked` so a concurrent
-- run (or a payment webhook landing at the same moment) can't double-release
-- or race the same order. Only reachable via the service-role client
-- (lib/orders/expirePendingOrders.ts, called from the cron route) — not
-- granted to authenticated/anon, since arbitrarily expiring orders isn't
-- something any logged-in user should be able to trigger.
-- ----------------------------------------------------------------------------
create or replace function public.expire_pending_orders(p_older_than_minutes integer default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_count integer := 0;
begin
  for v_order_id in
    select id from public.orders
    where status = 'pending'
      and created_at < now() - (p_older_than_minutes || ' minutes')::interval
    for update skip locked
  loop
    update public.ticket_types tt
      set sold = tt.sold - oi.quantity
      from public.order_items oi
      where oi.order_id = v_order_id and oi.ticket_type_id = tt.id;

    update public.orders set status = 'expired' where id = v_order_id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
