import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-white">
      <div className="wrap grid gap-8 py-12 text-sm sm:grid-cols-4">
        <div>
          <p className="display text-lg font-bold">Crownfunding</p>
          <p className="mt-2 text-ink-soft">All-or-nothing funding for creative work. This is a demo: pledges are simulated and no money moves.</p>
        </div>
        <div>
          <p className="font-semibold">Explore</p>
          <ul className="mt-3 space-y-2 text-ink-soft">
            <li><Link href="/discover" className="hover:text-royal">All projects</Link></li>
            <li><Link href="/discover?sort=end_date" className="hover:text-royal">Ending soon</Link></li>
            <li><Link href="/discover?sort=newest" className="hover:text-royal">Just launched</Link></li>
            <li><Link href="/discover?state=successful" className="hover:text-royal">Successfully funded</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">Categories</p>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-ink-soft">
            {CATEGORIES.map((c) => (
              <li key={c.slug}><Link href={`/discover?category=${c.slug}`} className="hover:text-royal">{c.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold">Creators</p>
          <ul className="mt-3 space-y-2 text-ink-soft">
            <li><Link href="/start" className="hover:text-royal">Start a project</Link></li>
            <li><Link href="/about" className="hover:text-royal">How it works</Link></li>
            <li><Link href="/dashboard" className="hover:text-royal">Your dashboard</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
