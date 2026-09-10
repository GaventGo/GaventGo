import QRDisplay from "@/components/tickets/QRDisplay";

export default function TicketCard({
  eventTitle,
  eventDateLabel,
  eventVenue,
  eventCity,
  ticketTypeName,
  quantity,
  holderName,
  qrDataUrl,
  scannedAt,
  wristbandId,
}: {
  eventTitle: string;
  eventDateLabel: string;
  eventVenue: string;
  eventCity: string;
  ticketTypeName: string;
  quantity: number;
  holderName: string;
  qrDataUrl: string;
  scannedAt: string | null;
  wristbandId: string | null;
}) {
  const isCheckedIn = Boolean(scannedAt);

  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-card-hover">
      <div className="bg-gradient-brand px-6 py-5 text-white">
        <p className="text-xs font-medium uppercase tracking-wider opacity-80">
          {ticketTypeName}
        </p>
        <h2 className="mt-0.5 text-lg font-bold">{eventTitle}</h2>
        <p className="mt-1 text-sm opacity-90">
          {eventDateLabel} · {eventVenue}, {eventCity}
        </p>
      </div>

      <div className="ticket-tear relative flex flex-col items-center px-6 py-8">
        <span className="ticket-notch-left" aria-hidden />
        <span className="ticket-notch-right" aria-hidden />

        <QRDisplay dataUrl={qrDataUrl} label="Show this at the entrance" />

        <dl className="mt-6 w-full space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink/40">Ticket holder</dt>
            <dd className="font-semibold text-ink">{holderName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink/40">Quantity</dt>
            <dd className="font-semibold text-ink">{quantity}</dd>
          </div>
        </dl>

        <span
          className={`mt-5 rounded-full px-3 py-1 text-xs font-semibold ${
            isCheckedIn
              ? "bg-success/10 text-success"
              : "bg-orange-50 text-orange-700"
          }`}
        >
          {isCheckedIn ? "Checked in" : "Not yet checked in"}
        </span>

        {wristbandId && (
          <p className="mt-2 text-xs text-ink/40">
            Wristband: <span className="font-semibold">{wristbandId}</span>
          </p>
        )}
      </div>
    </div>
  );
}
