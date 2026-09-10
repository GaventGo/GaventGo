import Link from "next/link";
import Image from "next/image";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Browse events", href: "/events" },
      { label: "For organizers", href: "/organizers" },
      { label: "For staff", href: "/staff/login" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of service", href: "/terms" },
      { label: "Privacy policy", href: "/privacy" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-black/5 bg-white">
      <div className="container-page py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo-icon.png"
                alt="GaventGo"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="text-lg font-bold text-ink">GaventGo</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-ink/50">
              Discover. Book. Go. Ghana&apos;s digital ticketing platform for
              events worth showing up for.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-ink">{col.title}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink/50 transition hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-black/5 pt-6 sm:flex-row">
          <p className="text-xs text-ink/40">
            © {new Date().getFullYear()} GaventGo. Made in Ghana 🇬🇭
          </p>
          <p className="text-xs text-ink/40">Discover. Book. Go.</p>
        </div>
      </div>
    </footer>
  );
}
