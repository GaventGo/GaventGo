-- ============================================================================
-- GAVENTGO — phase-8.sql
-- Standalone, idempotent migration. Two fixes:
-- 1. create_order() now rejects purchases for events whose date has
--    already passed. Previously it only checked status = 'published',
--    with no date check at all — meaning a customer could pay real money
--    for a ticket to an event that already happened. Confirmed live in
--    this app's own test data before this fix.
-- 2. No schema change needed for organizer-cancels-event — the events
--    table already has an update policy allowing organizers to change
--    their own events' status (events_update_own, from the original
--    schema). This migration only touches create_order().
-- ============================================================================

create or replace function public.create_order(p_event_id uuid, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id       uuid := auth.uid();
  v_event_status  text;
  v_event_date    date;
  v_order_id      uuid;
  v_total         numeric(10, 2) := 0;
  v_item          jsonb;
  v_ticket_type   record;
  v_qty           integer;
  v_subtotal      numeric(10, 2);
  v_seat          integer;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to purchase tickets.' using errcode = 'P0001';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'No tickets selected.' using errcode = 'P0001';
  end if;

  select status, event_date into v_event_status, v_event_date
    from public.events where id = p_event_id;

  if v_event_status is null then
    raise exception 'Event not found.' using errcode = 'P0001';
  end if;

  if v_event_status <> 'published' then
    raise exception 'This event is not currently available for purchase.' using errcode = 'P0001';
  end if;

  if v_event_date < current_date then
    raise exception 'This event has already taken place.' using errcode = 'P0001';
  end if;

  insert into public.orders (user_id, event_id, total_amount, status)
  values (v_user_id, p_event_id, 0, 'pending')
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item ->> 'quantity')::integer;

    if v_qty is null or v_qty < 1 then
      raise exception 'Ticket quantity must be at least 1.' using errcode = 'P0001';
    end if;

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

    v_subtotal := v_ticket_type.price;
    v_total := v_total + (v_subtotal * v_qty);

    for v_seat in 1..v_qty loop
      insert into public.order_items (order_id, ticket_type_id, quantity, unit_price, subtotal)
      values (v_order_id, v_ticket_type.id, 1, v_ticket_type.price, v_subtotal);
    end loop;

    update public.ticket_types
      set sold = sold + v_qty
      where id = v_ticket_type.id;
  end loop;

  update public.orders set total_amount = v_total where id = v_order_id;

  return v_order_id;
end;
$$;

grant execute on function public.create_order(uuid, jsonb) to authenticated;
