-- ============================================================================
-- GAVENTGO — phase-4.sql
-- Standalone, self-contained Phase 4 migration. Safe to run in full even if
-- some of this was already applied in an earlier session — every statement
-- is idempotent (IF NOT EXISTS / DROP POLICY IF EXISTS / CREATE OR REPLACE /
-- ON CONFLICT DO NOTHING throughout). Does not touch existing rows in
-- profiles, events, ticket_types, orders, or order_items beyond adding the
-- new columns below (existing rows get NULL in those columns, which is the
-- correct 'not issued/not scanned yet' state).
-- ============================================================================

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

-- ============================================================================
-- PHASE 4B — Supabase Storage: event-posters bucket + policies
--
-- Path convention: event-posters/{organizer_id}/{event_id}/{filename}.
-- Write policies check only the organizer_id folder segment against
-- auth.uid() (not that the event_id segment already exists as a real
-- event) — this is what lets the poster upload happen *before* the event
-- row is inserted: the client generates the event's id up front and
-- uploads to its future path, then submits the create-event form with that
-- same id. The organizer_id segment is the real security boundary; the
-- event_id segment is organizational, not authorization-bearing.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('event-posters', 'event-posters', true)
on conflict (id) do nothing;

-- Public bucket, so the public URL endpoint already serves files without
-- going through this policy — included anyway for defense-in-depth and for
-- any authenticated Storage API reads (e.g. a future admin tool) that do
-- go through RLS.
drop policy if exists "event_posters_public_read" on storage.objects;
create policy "event_posters_public_read"
  on storage.objects for select
  using (bucket_id = 'event-posters');

drop policy if exists "event_posters_organizer_insert" on storage.objects;
create policy "event_posters_organizer_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'event-posters'
    and auth.uid() is not null
    and auth.uid()::text = (storage.foldername(name))[1]
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'organizer'
    )
  );

drop policy if exists "event_posters_organizer_update" on storage.objects;
create policy "event_posters_organizer_update"
  on storage.objects for update
  using (
    bucket_id = 'event-posters'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'event-posters'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "event_posters_organizer_delete" on storage.objects;
create policy "event_posters_organizer_delete"
  on storage.objects for delete
  using (
    bucket_id = 'event-posters'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
