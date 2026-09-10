export default function LoadingEventDetail() {
  return (
    <div className="container-page py-10">
      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="h-64 w-full animate-pulse rounded-3xl bg-black/5 sm:h-96" />
          <div className="mt-6 h-4 w-24 animate-pulse rounded bg-black/5" />
          <div className="mt-2 h-9 w-2/3 animate-pulse rounded bg-black/5" />
        </div>
        <div className="h-64 animate-pulse rounded-3xl bg-black/5" />
      </div>
    </div>
  );
}
