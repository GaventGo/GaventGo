-- ============================================================================
-- GAVENTGO — phase-7.sql
-- Standalone, idempotent migration. Adds a payouts table: a record of money
-- you (the platform) have manually paid out to organizers. This does NOT
-- move any real money — all ticket revenue still lands in your own Paystack
-- account (see the app's own README/chat notes on this). This table is
-- just the bookkeeping so you have a record of what's owed and what's
-- already been paid, instead of doing that math by hand.
-- ============================================================================

create table if not exists public.payouts (
  id            uuid primary key default gen_random_uuid(),
  organizer_id  uuid not null references public.profiles (id) on delete cascade,
  amount        numeric(10, 2) not null check (amount > 0),
  note          text not null default '',
  paid_at       timestamptz not null default now(),
  created_by    uuid not null references public.profiles (id) on delete cascade
);

create index if not exists payouts_organizer_idx on public.payouts (organizer_id);

alter table public.payouts enable row level security;

-- Organizers can see payouts recorded for them — read-only, same pattern as
-- every other self-scoped policy in this schema.
drop policy if exists "payouts_select_own" on public.payouts;
create policy "payouts_select_own" on public.payouts
  for select using (organizer_id = auth.uid());

-- No insert/update/delete policy: writes only ever happen through the
-- admin client from the /admin/payouts page, which is itself gated by
-- PLATFORM_ADMIN_EMAIL in application code, not by a database role — this
-- app has no "admin" role yet, so RLS can't express that distinction. The
-- lack of a write policy here just means the anon/authenticated key can
-- never write to this table under any circumstance, which is the safe
-- default until a real admin role exists.
