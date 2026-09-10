export default function LoadingEvents() {
  return (
    <div className="container-page py-12">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-black/5" />
      <div className="mt-3 h-5 w-48 animate-pulse rounded-lg bg-black/5" />

      <div className="mt-8 flex gap-3">
        <div className="h-11 w-full max-w-xs animate-pulse rounded-xl bg-black/5" />
        <div className="h-11 w-52 animate-pulse rounded-xl bg-black/5" />
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl bg-white shadow-card"
          >
            <div className="h-44 w-full animate-pulse bg-black/5" />
            <div className="space-y-3 px-5 py-5">
              <div className="h-3 w-16 animate-pulse rounded bg-black/5" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-black/5" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-black/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
