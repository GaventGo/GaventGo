-- ============================================================================
-- GAVENTGO — phase-6.sql
-- Standalone, idempotent migration. Adds per-event staff invites, and fixes
-- a real gap this uncovered: scan_ticket() previously granted anyone with
-- role='staff' permission to scan tickets for ANY event on the platform,
-- not just events they were actually assigned to. This migration scopes
-- staff access to specific events via a new event_staff table.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- event_staff: which staff accounts may scan tickets for which events.
-- ----------------------------------------------------------------------------
create table if not exists public.event_staff (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  invited_by  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists event_staff_event_idx on public.event_staff (event_id);
create index if not exists event_staff_user_idx on public.event_staff (user_id);

alter table public.event_staff enable row level security;

drop policy if exists "event_staff_select_organizer" on public.event_staff;
create policy "event_staff_select_organizer" on public.event_staff
  for select using (
    exists (
      select 1 from public.events e
      where e.id = event_staff.event_id and e.organizer_id = auth.uid()
    )
  );

-- A staff member can see their own assignments (e.g. a future "my events"
-- view for staff) — read-only, same as every other self-row policy here.
drop policy if exists "event_staff_select_own" on public.event_staff;
create policy "event_staff_select_own" on public.event_staff
  for select using (user_id = auth.uid());

-- No insert/update/delete policies: all writes go through the
-- security-definer functions below, which enforce that only the event's
-- organizer can invite or remove staff for it.

-- ----------------------------------------------------------------------------
-- invite_event_staff(event, email): organizer-only. Promotes an existing
-- account (must already be signed up) to role='staff' if it's currently a
-- plain customer, and grants it scan access to this one event. Does not
-- create accounts or send emails itself — the organizer shares the
-- app URL with their staff member the normal way; this just grants access
-- once that person already has an account.
-- ----------------------------------------------------------------------------
create or replace function public.invite_event_staff(p_event_id uuid, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller       uuid := auth.uid();
  v_organizer_id uuid;
  v_target       record;
begin
  if v_caller is null then
    raise exception 'You must be logged in.' using errcode = 'P0001';
  end if;

  select organizer_id into v_organizer_id from public.events where id = p_event_id;

  if v_organizer_id is null then
    raise exception 'Event not found.' using errcode = 'P0001';
  end if;

  if v_organizer_id <> v_caller then
    raise exception 'You do not have permission to manage staff for this event.'
      using errcode = 'P0001';
  end if;

  select id, role into v_target from public.profiles where lower(email) = lower(trim(p_email));

  if v_target.id is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'No Gaventgo account found for that email. They need to sign up first.'
    );
  end if;

  if v_target.id = v_caller then
    return jsonb_build_object('ok', false, 'error', 'You cannot invite yourself.');
  end if;

  if v_target.role = 'organizer' then
    return jsonb_build_object(
      'ok', false,
      'error', 'That account is an organizer account and cannot also be added as staff.'
    );
  end if;

  if v_target.role <> 'staff' then
    update public.profiles set role = 'staff' where id = v_target.id;
  end if;

  insert into public.event_staff (event_id, user_id, invited_by)
  values (p_event_id, v_target.id, v_caller)
  on conflict (event_id, user_id) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.invite_event_staff(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- remove_event_staff(event, user): organizer-only. Revokes scan access to
-- this one event. Deliberately does not downgrade the account's role back
-- to 'customer' — they may still be staff on other organizers' events, and
-- role alone no longer grants any access on its own after this migration.
-- ----------------------------------------------------------------------------
create or replace function public.remove_event_staff(p_event_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller       uuid := auth.uid();
  v_organizer_id uuid;
begin
  if v_caller is null then
    raise exception 'You must be logged in.' using errcode = 'P0001';
  end if;

  select organizer_id into v_organizer_id from public.events where id = p_event_id;

  if v_organizer_id is null or v_organizer_id <> v_caller then
    raise exception 'You do not have permission to manage staff for this event.'
      using errcode = 'P0001';
  end if;

  delete from public.event_staff where event_id = p_event_id and user_id = p_user_id;
end;
$$;

grant execute on function public.remove_event_staff(uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- scan_ticket(): close the blanket-staff-access gap. A 'staff' role alone
-- no longer grants scan access to every event — it must be paired with a
-- matching event_staff row for the specific event being scanned. The
-- organizer-owns-the-event path is unchanged.
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

  if not (
    (v_role = 'organizer' and v_item.organizer_id = v_caller)
    or (
      v_role = 'staff'
      and exists (
        select 1 from public.event_staff es
        where es.event_id = v_item.event_id and es.user_id = v_caller
      )
    )
  ) then
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
