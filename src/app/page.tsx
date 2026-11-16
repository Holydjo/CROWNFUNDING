import Link from "next/link";
import { CATEGORIES, categoryBySlug } from "@/lib/categories";
import { money, num, percent, shortTimeLeft } from "@/lib/format";
import { featuredProject, liveProjects, siteStats } from "@/lib/queries";
import { Cover, Flash, Progress, ProjectGrid, type SP } from "@/components/ui";

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="wrap mt-16">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="display text-2xl font-bold sm:text-3xl">{title}</h2>
        <Link href={href} className="whitespace-nowrap text-sm font-semibold text-royal hover:underline">Discover more →</Link>
      </div>
      {children}
    </section>
  );
}

export default async function Home({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
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
          <h1 className="display mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">Fund the things worth making.</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink-soft">
            Crownfunding is where independent creators and the people who believe in them bring new work to life — together, all-or-nothing.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/discover" className="btn btn-primary">Explore projects</Link>
            <Link href="/start" className="btn btn-ghost">Start a project</Link>
          </div>
          <dl className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-4 text-center" data-testid="site-stats">
            <div><dt className="text-xs uppercase tracking-wide text-ink-soft">Projects launched</dt><dd className="display mt-1 text-2xl font-bold sm:text-3xl">{num(stats.projects)}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-ink-soft">Pledged</dt><dd className="display mt-1 text-2xl font-bold sm:text-3xl">{money(stats.pledged)}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-ink-soft">Pledges</dt><dd className="display mt-1 text-2xl font-bold sm:text-3xl">{num(stats.pledges)}</dd></div>
          </dl>
        </div>
      </section>

      {featured && (
        <section className="wrap mt-14" data-testid="featured">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-royal">Featured project</p>
          <div className="card grid overflow-hidden md:grid-cols-5">
            <Link href={`/projects/${featured.slug}`} className="block aspect-video md:col-span-3 md:aspect-auto md:min-h-80">
              <Cover project={featured} />
            </Link>
            <div className="flex flex-col p-6 md:col-span-2 md:p-8">
              <h2 className="display text-2xl font-bold leading-tight sm:text-3xl">
                <Link href={`/projects/${featured.slug}`} className="hover:text-royal">{featured.title}</Link>
              </h2>
              <p className="mt-2 text-sm text-ink-soft">by {featured.creator_name}</p>
              <p className="mt-4 text-ink-soft">{featured.blurb}</p>
              <div className="mt-6"><Progress pledged={featured.pledged} goal={featured.goal} /></div>
              <p className="mt-3 text-sm">
                <span className="font-semibold text-good">{money(featured.pledged)}</span> pledged • {percent(featured.pledged, featured.goal)}% funded • {shortTimeLeft(featured.deadline)}
              </p>
              <p className="mt-2 text-xs text-ink-soft">{categoryBySlug(featured.category).name} • {featured.location}</p>
              <div className="mt-auto pt-6"><Link href={`/projects/${featured.slug}`} className="btn btn-primary">View project</Link></div>
            </div>
          </div>
        </section>
      )}

      <Section title="Recommended for you" href="/discover?sort=popularity"><ProjectGrid projects={recommended} /></Section>
      {almost.length > 0 && (
        <Section title="Almost funded" href="/discover?sort=end_date"><ProjectGrid projects={almost} note={() => "Almost funded"} /></Section>
      )}
      <Section title="Home stretch" href="/discover?sort=end_date"><ProjectGrid projects={homeStretch} note={() => "Ending soon"} /></Section>
      <Section title="Fresh launches" href="/discover?sort=newest"><ProjectGrid projects={fresh} /></Section>

      <section className="wrap mt-16">
        <h2 className="display mb-6 text-2xl font-bold sm:text-3xl">Browse by category</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" data-testid="category-grid">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/discover?category=${c.slug}`} className="card flex flex-col items-center gap-2 px-3 py-5 text-sm font-semibold hover:border-royal hover:text-royal">
              <span className="text-2xl" aria-hidden="true">{c.emoji}</span>
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap mt-16">
        <div className="rounded-3xl bg-ink px-6 py-12 text-center text-white sm:px-12">
          <h2 className="display text-3xl font-bold">Have something to make?</h2>
          <p className="mx-auto mt-3 max-w-lg text-white/70">Set a goal, pick a deadline, offer rewards. If your community gets you there, you&apos;re funded.</p>
          <Link href="/start" className="btn mt-6 bg-crown text-ink hover:bg-white">Start a project</Link>
        </div>
      </section>
    </>
  );
}
