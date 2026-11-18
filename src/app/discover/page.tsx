import Link from "next/link";
import type { Metadata } from "next";
import { CATEGORIES, isCategory } from "@/lib/categories";
import { getT } from "@/lib/i18n";
import { discover, PAGE_SIZE, SORTS, STATES, type Sort, type StateFilter } from "@/lib/queries";
import { first, Flash, ProjectGrid, type SP } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).discover.metaTitle };
}

export default async function Discover({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const t = await getT();
  const d = t.discover;
  const q = first(sp.q).trim().slice(0, 100);
  const category = isCategory(first(sp.category)) ? first(sp.category) : "";
  const sort = (SORTS.includes(first(sp.sort) as Sort) ? first(sp.sort) : "magic") as Sort;
  const state = (STATES.includes(first(sp.state) as StateFilter) ? first(sp.state) : "live") as StateFilter;
  const page = Math.max(1, parseInt(first(sp.page) || "1", 10) || 1);
  const { projects, total } = discover({ q, category, sort, state, page });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const link = (over: Record<string, string>) => {
    const params = new URLSearchParams();
    const merged = { q, category, sort, state, page: "1", ...over };
    for (const [k, v] of Object.entries(merged)) {
      if (!v) continue;
      if ((k === "sort" && v === "magic") || (k === "state" && v === "live") || (k === "page" && v === "1")) continue;
      params.set(k, v);
    }
    const s = params.toString();
    return s ? `/discover?${s}` : "/discover";
  };

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 ${active ? "border-royal bg-royal-tint font-semibold text-royal" : "border-line bg-white hover:border-royal"}`;

  return (
    <>
      <Flash sp={sp} />
      <div className="wrap pt-10">
        <h1 className="display text-3xl font-bold sm:text-4xl">
          {category ? t.category(category) : d.title}
          {q && <span className="text-ink-soft"> — “{q}”</span>}
        </h1>
        <p className="mt-2 text-ink-soft" data-testid="result-count">{d.count(total, t.num(total))}</p>

        <form action="/discover" method="get" className="card mt-6 grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto_auto]">
          <input name="q" type="search" defaultValue={q} placeholder={t.nav.searchPlaceholder} aria-label={d.search} className="field" />
          <select name="category" defaultValue={category} aria-label={d.category} className="field">
            <option value="">{d.allCategories}</option>
            {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{t.category(c.slug)}</option>)}
          </select>
          <select name="state" defaultValue={state} aria-label={d.status} className="field">
            {STATES.map((k) => <option key={k} value={k}>{t.states[k]}</option>)}
          </select>
          <select name="sort" defaultValue={sort} aria-label={d.sort} className="field">
            {SORTS.map((k) => <option key={k} value={k}>{t.sorts[k]}</option>)}
          </select>
          <button type="submit" className="btn btn-primary">{d.apply}</button>
        </form>

        <nav aria-label={t.nav.categories} className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link href={link({ category: "" })} className={chip(!category)}>{d.all}</Link>
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={link({ category: c.slug })} className={chip(category === c.slug)}>{t.category(c.slug)}</Link>
          ))}
        </nav>

        <div className="mt-10">
          {projects.length ? (
            <ProjectGrid projects={projects} />
          ) : (
            <div className="card px-6 py-16 text-center" data-testid="no-results">
              <p className="display text-2xl font-bold">{d.emptyTitle}</p>
              <p className="mt-2 text-ink-soft">{d.emptyText}</p>
              <Link href="/discover" className="btn btn-ghost mt-6">{d.clear}</Link>
            </div>
          )}
        </div>

        {pages > 1 && (
          <nav aria-label={d.pagination} className="mt-12 flex items-center justify-center gap-3 text-sm">
            {page > 1 ? <Link href={link({ page: String(page - 1) })} className="btn btn-ghost" rel="prev">{d.prev}</Link> : <span className="btn btn-ghost opacity-40">{d.prev}</span>}
            <span className="text-ink-soft" data-testid="page-indicator">{d.page(page, pages)}</span>
            {page < pages ? <Link href={link({ page: String(page + 1) })} className="btn btn-ghost" rel="next">{d.next}</Link> : <span className="btn btn-ghost opacity-40">{d.next}</span>}
          </nav>
        )}
      </div>
    </>
  );
}
