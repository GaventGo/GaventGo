import type { EventAnalytics } from "@/lib/actions/analytics";

export default function EventAnalyticsPanel({
  analytics,
}: {
  analytics: EventAnalytics;
}) {
  const maxDayRevenue = Math.max(
    1,
    ...analytics.salesByDay.map((d) => d.revenue)
  );

  if (analytics.totalPaidTickets === 0) {
    return (
      <p className="text-sm text-ink/40">
        No paid sales yet — analytics will fill in once tickets start
        selling.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-2xl font-bold text-ink">
            {analytics.totalPaidTickets}
          </p>
          <p className="text-xs text-ink/40">tickets sold</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-ink">
            {analytics.scannedCount}
          </p>
          <p className="text-xs text-ink/40">checked in</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-ink">
            {analytics.checkInRate.toFixed(0)}%
          </p>
          <p className="text-xs text-ink/40">check-in rate</p>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/40">
          Sales by day
        </h3>
        <div className="mt-3 space-y-1.5">
          {analytics.salesByDay.map((day) => (
            <div key={day.date} className="flex items-center gap-3 text-xs">
              <span className="w-20 shrink-0 text-ink/40">
                {new Date(day.date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <div className="h-4 flex-1 overflow-hidden rounded-full bg-black/5">
                <div
                  className="h-full rounded-full bg-purple-600"
                  style={{
                    width: `${(day.revenue / maxDayRevenue) * 100}%`,
                  }}
                />
              </div>
              <span className="w-24 shrink-0 text-right font-semibold text-ink">
                GH₵{day.revenue.toFixed(0)} · {day.ticketsSold}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/40">
          By ticket type
        </h3>
        <ul className="mt-3 space-y-2">
          {analytics.byTicketType.map((type) => (
            <li
              key={type.name}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-ink">
                {type.name}{" "}
                <span className="text-xs text-ink/40">× {type.sold}</span>
              </span>
              <span className="font-semibold text-ink">
                GH₵{type.revenue.toFixed(0)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
