import Link from "next/link";
import { categories } from "@/lib/data";

export default function Categories() {
  return (
    <section className="container-page py-16">
      <div className="flex items-end justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Browse by category
        </h2>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((cat) => (
          <Link
            key={cat.name}
            href={`/events?category=${cat.name.toLowerCase()}`}
            className="group flex flex-col items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-8 text-center shadow-card transition hover:-translate-y-1 hover:shadow-card-hover"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-2xl transition group-hover:bg-purple-100">
              {cat.icon}
            </span>
            <span className="text-sm font-semibold text-ink">
              {cat.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
