import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { getT } from "@/lib/i18n";

export async function Footer() {
  const t = await getT();
  return (
    <footer className="mt-20 border-t border-line bg-white">
      <div className="wrap grid gap-8 py-12 text-sm sm:grid-cols-4">
        <div>
          <p className="display text-lg font-bold">Crownfunding</p>
          <p className="mt-2 text-ink-soft">{t.footer.blurb}</p>
          <form action="/api/lang" method="post" className="mt-5" aria-label={t.footer.language}>
            <p className="mb-2 font-semibold">{t.footer.language}</p>
            <div className="inline-flex rounded-full border border-line p-1" data-testid="lang-picker">
              {([["en", "English"], ["fr", "Français"]] as const).map(([code, label]) => (
                <button key={code} type="submit" name="lang" value={code} lang={code} aria-pressed={t.locale === code}
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${t.locale === code ? "bg-royal text-white" : "text-ink-soft hover:text-ink"}`}>
                  {label}
                </button>
              ))}
            </div>
          </form>
        </div>
        <div>
          <p className="font-semibold">{t.footer.explore}</p>
          <ul className="mt-3 space-y-2 text-ink-soft">
            <li><Link href="/discover" className="hover:text-royal">{t.footer.all}</Link></li>
            <li><Link href="/discover?sort=end_date" className="hover:text-royal">{t.footer.endingSoon}</Link></li>
            <li><Link href="/discover?sort=newest" className="hover:text-royal">{t.footer.justLaunched}</Link></li>
            <li><Link href="/discover?state=successful" className="hover:text-royal">{t.footer.funded}</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">{t.footer.categories}</p>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-ink-soft">
            {CATEGORIES.map((c) => (
              <li key={c.slug}><Link href={`/discover?category=${c.slug}`} className="hover:text-royal">{t.category(c.slug)}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold">{t.footer.creators}</p>
          <ul className="mt-3 space-y-2 text-ink-soft">
            <li><Link href="/start" className="hover:text-royal">{t.nav.start}</Link></li>
            <li><Link href="/about" className="hover:text-royal">{t.nav.how}</Link></li>
            <li><Link href="/dashboard" className="hover:text-royal">{t.footer.dashboard}</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
