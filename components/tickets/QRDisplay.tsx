export default function QRDisplay({
  dataUrl,
  label,
}: {
  dataUrl: string;
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dataUrl}
          alt="Ticket QR code"
          className="h-56 w-56"
          width={224}
          height={224}
        />
      </div>
      {label && <p className="text-xs text-ink/40">{label}</p>}
    </div>
  );
}
