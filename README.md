# GaventGo — Phase 4 package

This folder contains only the files that are **new or changed** for this
round of Phase 4 work. Everything else in your existing GaventGo project
(Phase 1 landing page, Phase 2A auth/events, Phase 3 checkout/payments, and
the QR/scanning/expiry work from the earlier Phase 4 session) is untouched
and should stay exactly as it is.

## 1. What this round of Phase 4 adds

- The **Paystack webhook**, at the path Paystack actually needs
  (`/api/paystack/webhook`) — see the bug explanation below for why this
  mattered.
- A **self-healing recovery path** on the customer ticket page: if an order
  is `paid` but its `order_item` has no `qr_code` (for any reason, not just
  the one that already happened to you), the ticket page now issues the
  missing QR on the spot instead of leaving the customer stuck.
- **Event poster upload** via Supabase Storage — organizers can upload a
  real image file instead of pasting a URL, both when creating an event and
  afterward from the event management page.

## 2. The original QR problem, explained

You had a real row like this:

```
order_items.qr_code = null
orders.status = paid
```

I inspected `lib/payments/settle.ts` first, as instructed, rather than
assuming anything. It already calls `issueTicketsForOrder()` in **every**
path that sets `status = 'paid'`, including its own idempotent
already-paid branch — so if this order had gone through
`settleOrderByReference()` even once, it would have a QR code. It didn't.

The only way `orders.status` becomes `'paid'` without going through that
function is a **direct edit outside the app** — e.g. manually running
`update orders set status = 'paid' ...` in the SQL Editor. That's a
realistic thing to have done while testing checkout without Paystack
credentials configured yet (my own Phase 3/4 documentation even suggested
exactly that shortcut for testing, which is what most likely produced this
row — worth knowing, and I've corrected that advice below).

Separately, and independently of how this particular row was created:
Paystack could only ever have reached this app's webhook if it was
configured to call a route that exists. The project only had
`/api/payments/webhook`; nothing was listening at `/api/paystack/webhook`.
If your Paystack dashboard was pointed at the latter (a very reasonable
assumption for a project called "GaventGo" integrating "Paystack"), every
real webhook delivery would have 404'd, silently.

**Both problems are fixed now:**
1. The webhook lives at the correct, required path.
2. The ticket page self-heals any paid-but-unissued row on view, regardless
   of how it got that way — so this specific stuck order, and any other
   like it, will show a working QR the next time the customer opens it. No
   re-payment, no new order.

## 3. Files added

| File | Purpose |
|---|---|
| `app/api/paystack/webhook/route.ts` | The Paystack webhook, correctly located |
| `components/organizer/PosterUpload.tsx` | File picker + direct-to-Storage upload, with preview |
| `components/organizer/EventPosterEditor.tsx` | Wraps the above for an *existing* event — uploads, then persists via `updateEventPoster` |
| `phase-4.sql` | Storage bucket/policies (new) + an idempotent restatement of the QR/scan/expiry SQL from the earlier Phase 4 session, so this file is safe to run standalone |

## 4. Files modified

| File | What changed |
|---|---|
| `lib/payments/settle.ts` | `issueTicketsForOrder` is now exported (was a private helper) so the ticket page's recovery path can call the exact same issuance logic — no second implementation |
| `app/account/tickets/[orderItemId]/page.tsx` | Added the self-healing recovery block described above |
| `app/account/page.tsx` | The "View ticket" link now shows for any `paid` order item (the detail page guarantees a QR exists by the time it renders), instead of only when `qr_code` already happened to be set |
| `lib/actions/events.ts` | `createEvent` now accepts an optional client-generated `id` (see below); added `updateEventPoster(eventId, posterUrl)` |
| `components/organizer/CreateEventForm.tsx` | Poster field is now the upload widget instead of a plain URL input; generates the event's id client-side up front |
| `app/organizers/create/page.tsx` | Passes the organizer's `user.id` down to the form |
| `app/organizers/events/[id]/page.tsx` | Added an "Event poster" section using `EventPosterEditor` (replace an existing event's poster) |
| `next.config.js` | Whitelisted the Supabase Storage domain for `next/image` |

**Removed:** `app/api/payments/webhook/route.ts` — replaced by
`app/api/paystack/webhook/route.ts`. Delete the old
`app/api/payments/` folder from your project; keeping both would mean two
copies of the signature-verification/settlement wiring, which is exactly
what this project's conventions (and your instructions) say not to do.

**Not modified, inspected and already correct:** `app/checkout/success/page.tsx`
already calls only `settleOrderByReference` and never claims a ticket exists
before payment is confirmed — no change needed. `lib/tickets/qr.ts`,
`components/tickets/TicketCard.tsx`, `components/tickets/QRDisplay.tsx`,
`app/staff/scan/page.tsx`, `components/staff/ScannerClient.tsx`,
`lib/actions/scan.ts` were all inspected and already match the current
schema — also unchanged.

## 5. Why the poster upload needed a small architecture decision

Your suggested path structure was
`event-posters/{organizer_id}/{event_id}/{filename}` — but for a *new*
event, `event_id` doesn't exist until the create form is submitted, and
uploading a file logically happens before that submit. Rather than a
two-step "create event, then upload" flow (which breaks the existing
one-page create form), `CreateEventForm` now generates the event's UUID
client-side the moment the form mounts, uploads straight to its real final
path using that id, and submits that same id as the row's primary key on
create. The storage write policies only check that the *organizer_id*
folder segment matches the uploader (`auth.uid()`) and that they hold the
`organizer` role — they don't require the event to already exist, since the
event_id segment is organizational, not a security boundary. Documented in
`phase-4.sql` at the point it matters.

**Existing events** (management page) don't have this problem — the event
already has a real id — so `EventPosterEditor` there just uploads and
immediately calls `updateEventPoster` to persist it.

## 6. Where every file goes

Copy each file to the same relative path inside your existing `gaventgo/`
project root, overwriting the files listed under "Files modified" above.
`phase-4.sql` doesn't get copied into the app — it's a migration you run
directly in Supabase (next section).

## 7. How to run `phase-4.sql`

Open the Supabase SQL Editor for your project and paste the entire contents
of `phase-4.sql`, then run it. It's safe even if some of it (the QR
columns, `scan_ticket()`, `expire_pending_orders()`) was already applied —
every statement either checks `IF NOT EXISTS`, uses `DROP POLICY IF EXISTS`
before recreating, or is a `CREATE OR REPLACE FUNCTION`. It does not delete
or modify any existing row in `orders`, `order_items`, `events`, or
`profiles` — the new `order_items` columns just come back `NULL` on
existing rows, which is the correct state for "not issued yet."

## 8. Configuring Supabase Storage

`phase-4.sql` creates the bucket for you
(`insert into storage.buckets ...`), so there's no separate manual bucket-
creation step — just run the SQL. It creates the `event-posters` bucket as
**public** (poster images aren't sensitive; this is what makes a plain
`<img src="...">`/`next/image` URL work without a signed-URL dance), plus
write policies scoped to each organizer's own folder.

## 9. Environment variables

No new environment variables. Storage uses the same
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` your app
already has. The webhook uses the existing `PAYSTACK_SECRET_KEY`.

## 10. How the Paystack webhook works

Paystack POSTs an event payload to your webhook URL, with an
`x-paystack-signature` header (HMAC-SHA512 of the raw body, keyed with your
Paystack secret key). `app/api/paystack/webhook/route.ts`:

1. Reads the raw request body (needed for signature verification —
   `request.json()` would parse it before the signature can be checked
   against the exact bytes Paystack signed).
2. Verifies the signature. Wrong or missing → `401`, nothing else happens.
3. Parses the payload; on a `charge.success` event, calls
   `settleOrderByReference(reference)` — the one authoritative settlement
   function, unchanged, doing everything: re-verifying with Paystack
   server-to-server, checking the amount, flipping `orders.status`, and
   issuing QR codes.
4. Always returns `200` (or `502` only if our own call to Paystack's verify
   API failed, so Paystack retries) so Paystack considers the webhook
   delivered.

**Idempotent by construction:** `settleOrderByReference` checks
`order.status === "paid"` and short-circuits before touching status again,
re-running only the (also idempotent, `qr_code IS NULL`-guarded) issuance
step. Paystack redelivering the same webhook, or it arriving after the
checkout success page already settled the same order, never double-charges
status changes or issues a second QR code.

## 11. Configuring the webhook URL in Paystack

Paystack dashboard → **Settings → API Keys & Webhooks** → set the webhook
URL to:

```
https://<your-domain>/api/paystack/webhook
```

If you had it pointed at `/api/payments/webhook` before, update it — that
path no longer exists.

## 12. Testing

**Payment → QR pipeline (the full path from your testing list):**
1. Sign in as a customer, select an event and ticket, create an order.
2. Start payment, complete it via Paystack (test mode is fine).
3. Confirm the webhook fires (Paystack dashboard shows delivery attempts +
   response codes — you should see `200` from `/api/paystack/webhook`).
4. `/account` → the order shows `paid` → **View ticket & QR code**.
5. Ticket page renders the QR immediately (no missing-QR case, since it
   went through the webhook this time).

**Webhook robustness:**
- Trigger the same webhook delivery twice (Paystack's dashboard lets you
  resend a webhook event) → confirm no duplicate QR, no error.
- Visit `/checkout/success?reference=...` before the webhook has fired, then
  let the webhook fire afterward (or vice versa) → confirm the order still
  ends up correctly `paid` with exactly one QR per item either way.

**The exact bug this round fixes:**
- Manually set an existing order to `status = 'paid'` in the SQL Editor
  without going through settlement (reproducing the original bug on
  purpose) → visit that order's ticket page → confirm a QR now appears
  (issued on the spot) instead of "not available yet."

**Scanning** (unchanged from the earlier Phase 4 session, still applies):
scan a valid paid ticket → "Checked in" + wristband assigned; scan it again
→ "Already checked in"; scan a pending order's code → "Not paid"; scan
garbage → "Invalid ticket"; confirm a customer-role account gets a
permission error calling `scan_ticket` directly, and that an organizer
can't scan a ticket for another organizer's event.

**Poster upload:**
- Create a new event, upload a poster during creation → confirm the poster
  shows on the event card and detail page after creating.
- On an existing event's management page, replace the poster → confirm the
  old file is removed from Storage (check the bucket contents) and the new
  one displays everywhere the event's poster is shown.
- Try uploading a non-image file → rejected client-side with a clear
  message. Try a file over 5MB → rejected client-side.
- Confirm (e.g. via a second test organizer account, or by hand-crafting a
  request) that uploading into another organizer's folder path is rejected
  by the storage policy, not just hidden in the UI.

## 13. Pending-order expiry

Unchanged from the earlier Phase 4 session — `expire_pending_orders()`
(restated idempotently in `phase-4.sql`) is called from
`/api/cron/expire-orders`, scheduled via `vercel.json` (every 10 minutes).
Nothing about this round's changes affects that path.

## 14. Limitations

- One QR per `order_item`, not per individual seat (preserved exactly as
  it was — see the note in the earlier Phase 4 delivery; not revisited
  here since the instructions for this round said not to change it without
  strong reason).
- No staff self-service invite flow yet — promoting an account to `staff`
  is still a manual SQL statement (documented in the main project README).
- The self-healing recovery path fixes a paid-but-unissued row **on next
  view** of that specific ticket page — it's not a background sweep. Given
  the webhook is now reachable and settlement is idempotent, new orders
  shouldn't hit this case going forward; the recovery path exists mainly to
  repair rows like the one you found, and as a safety net for any future
  out-of-band status edit.
- Storage bucket is public by design (see §8) — poster URLs are guessable
  once uploaded, which is an accepted tradeoff for content that's meant to
  be publicly visible on event pages anyway.
