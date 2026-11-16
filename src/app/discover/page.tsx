import Link from "next/link";
import type { Metadata } from "next";
import { CATEGORIES, isCategory, categoryBySlug } from "@/lib/categories";
import { discover, PAGE_SIZE, SORTS, STATES, type Sort, type StateFilter } from "@/lib/queries";
import { first, Flash, ProjectGrid, type SP } from "@/components/ui";
import { num } from "@/lib/format";

export const metadata: Metadata = { title: "Discover projects" };

export default async function Discover({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = first(sp.q).trim().slice(0, 100);
  const category = isCategory(first(sp.category)) ? first(sp.category) : "";
  const sort = (first(sp.sort) in SORTS ? first(sp.sort) : "magic") as Sort;
  const state = (first(sp.state) in STATES ? first(sp.state) : "live") as StateFilter;
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

  return (
    <>
      <Flash sp={sp} />
      <div className="wrap pt-10">
        <h1 className="display text-3xl font-bold sm:text-4xl">
          {category ? categoryBySlug(category).name : "Discover"}
          {q && <span className="text-ink-soft"> — “{q}”</span>}
        </h1>
        <p className="mt-2 text-ink-soft" data-testid="result-count">
          {num(total)} {total === 1 ? "project" : "projects"}
        </p>

        <form action="/discover" method="get" className="card mt-6 grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto_auto]">
          <input name="q" type="search" defaultValue={q} placeholder="Search projects, creators, places" aria-label="Search" className="field" />
          <select name="category" defaultValue={category} aria-label="Category" className="field">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
          <select name="state" defaultValue={state} aria-label="Status" className="field">
            {Object.entries(STATES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select name="sort" defaultValue={sort} aria-label="Sort by" className="field">
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button type="submit" className="btn btn-primary">Apply</button>
        </form>

        <nav aria-label="Categories" className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link href={link({ category: "" })} className={`rounded-full border px-3 py-1 ${!category ? "border-royal bg-royal-tint font-semibold text-royal" : "border-line bg-white hover:border-royal"}`}>All</Link>
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={link({ category: c.slug })} className={`rounded-full border px-3 py-1 ${category === c.slug ? "border-royal bg-royal-tint font-semibold text-royal" : "border-line bg-white hover:border-royal"}`}>
              {c.name}
            </Link>
          ))}
        </nav>

        <div className="mt-10">
          {projects.length ? (
            <ProjectGrid projects={projects} />
          ) : (
            <div className="card px-6 py-16 text-center" data-testid="no-results">
              <p className="display text-2xl font-bold">No projects match that search.</p>
              <p className="mt-2 text-ink-soft">Try a different word, another category, or include ended campaigns.</p>
              <Link href="/discover" className="btn btn-ghost mt-6">Clear filters</Link>
            </div>
          )}
        </div>

        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-3 text-sm">
            {page > 1 ? <Link href={link({ page: String(page - 1) })} className="btn btn-ghost" rel="prev">← Previous</Link> : <span className="btn btn-ghost opacity-40">← Previous</span>}
            <span className="text-ink-soft" data-testid="page-indicator">Page {page} of {pages}</span>
            {page < pages ? <Link href={link({ page: String(page + 1) })} className="btn btn-ghost" rel="next">Next →</Link> : <span className="btn btn-ghost opacity-40">Next →</span>}
          </nav>
        )}
      </div>
    </>
  );
}
