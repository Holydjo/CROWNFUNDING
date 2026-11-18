import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { percent } from "@/lib/format";
import { getT } from "@/lib/i18n";
import { featuredProject, liveProjects, siteStats } from "@/lib/queries";
import { Cover, Flash, Progress, ProjectGrid, type SP } from "@/components/ui";

function Section({ title, href, more, children }: { title: string; href: string; more: string; children: React.ReactNode }) {
  return (
    <section className="wrap mt-16">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="display text-2xl font-bold sm:text-3xl">{title}</h2>
        <Link href={href} className="whitespace-nowrap text-sm font-semibold text-royal hover:underline">{more}</Link>
      </div>
      {children}
    </section>
  );
}

export default async function Home({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const t = await getT();
  const h = t.home;
  const stats = siteStats();
  const featured = featuredProject();
  const recommended = liveProjects("backers DESC", 7).filter((p) => p.id !== featured?.id).slice(0, 6);
  const almost = liveProjects(
    "(COALESCE(s.pledged, 0) * 1.0 / p.goal) DESC",
    3,
    "COALESCE(s.pledged, 0) < p.goal AND COALESCE(s.pledged, 0) >= p.goal * 0.6"
  );
  const homeStretch = liveProjects("p.deadline ASC", 3);
  const fresh = liveProjects("p.launched_at DESC", 3);

  return (
    <>
      <Flash sp={sp} />
      <section className="border-b border-line bg-white">
        <div className="wrap py-14 text-center sm:py-20">
          <h1 className="display mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">{h.heroTitle}</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink-soft">{h.heroText}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/discover" className="btn btn-primary">{h.explore}</Link>
            <Link href="/start" className="btn btn-ghost">{h.start}</Link>
          </div>
          <dl className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-4 text-center" data-testid="site-stats">
            <div><dt className="text-xs uppercase tracking-wide text-ink-soft">{h.statProjects}</dt><dd className="display mt-1 text-2xl font-bold sm:text-3xl">{t.num(stats.projects)}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-ink-soft">{h.statPledged}</dt><dd className="display mt-1 text-2xl font-bold sm:text-3xl">{t.money(stats.pledged)}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-ink-soft">{h.statPledges}</dt><dd className="display mt-1 text-2xl font-bold sm:text-3xl">{t.num(stats.pledges)}</dd></div>
          </dl>
        </div>
      </section>

      {featured && (
        <section className="wrap mt-14" data-testid="featured">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-royal">{h.featured}</p>
          <div className="card grid overflow-hidden md:grid-cols-5">
            <Link href={`/projects/${featured.slug}`} className="block aspect-video md:col-span-3 md:aspect-auto md:min-h-80">
              <Cover project={featured} />
            </Link>
            <div className="flex flex-col p-6 md:col-span-2 md:p-8">
              <h2 className="display text-2xl font-bold leading-tight sm:text-3xl">
                <Link href={`/projects/${featured.slug}`} className="hover:text-royal">{featured.title}</Link>
              </h2>
              <p className="mt-2 text-sm text-ink-soft">{h.by(featured.creator_name)}</p>
              <p className="mt-4 text-ink-soft">{featured.blurb}</p>
              <div className="mt-6"><Progress pledged={featured.pledged} goal={featured.goal} /></div>
              <p className="mt-3 text-sm">
                <span className="font-semibold text-good">{t.money(featured.pledged)}</span>{" "}
                {h.pledgedSuffix(percent(featured.pledged, featured.goal), t.shortTimeLeft(featured.deadline))}
              </p>
              <p className="mt-2 text-xs text-ink-soft">{t.category(featured.category)} • {featured.location}</p>
              <div className="mt-auto pt-6"><Link href={`/projects/${featured.slug}`} className="btn btn-primary">{h.viewProject}</Link></div>
            </div>
          </div>
        </section>
      )}

      <Section title={h.recommended} href="/discover?sort=popularity" more={h.discoverMore}><ProjectGrid projects={recommended} /></Section>
      {almost.length > 0 && (
        <Section title={h.almost} href="/discover?sort=end_date" more={h.discoverMore}><ProjectGrid projects={almost} note={() => h.noteAlmost} /></Section>
      )}
      <Section title={h.homeStretch} href="/discover?sort=end_date" more={h.discoverMore}><ProjectGrid projects={homeStretch} note={() => h.noteEnding} /></Section>
      <Section title={h.fresh} href="/discover?sort=newest" more={h.discoverMore}><ProjectGrid projects={fresh} /></Section>

      <section className="wrap mt-16">
        <h2 className="display mb-6 text-2xl font-bold sm:text-3xl">{h.browse}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" data-testid="category-grid">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/discover?category=${c.slug}`} className="card flex flex-col items-center gap-2 px-3 py-5 text-center text-sm font-semibold hover:border-royal hover:text-royal">
              <span className="text-2xl" aria-hidden="true">{c.emoji}</span>
              {t.category(c.slug)}
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap mt-16">
        <div className="rounded-3xl bg-ink px-6 py-12 text-center text-white sm:px-12">
          <h2 className="display text-3xl font-bold">{h.ctaTitle}</h2>
          <p className="mx-auto mt-3 max-w-lg text-white/70">{h.ctaText}</p>
          <Link href="/start" className="btn mt-6 bg-crown text-ink hover:bg-white">{h.start}</Link>
        </div>
      </section>
    </>
  );
}
