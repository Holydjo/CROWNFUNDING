import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).about.metaTitle };
}

export default async function About() {
  const t = await getT();
  const A = t.about;
  return (
    <div className="wrap max-w-3xl pt-12">
      <h1 className="display text-4xl font-bold sm:text-5xl">{A.title}</h1>
      <p className="mt-4 text-lg text-ink-soft">{A.intro}</p>
      <ol className="mt-10 space-y-4">
        {A.steps.map(([title, body], i) => (
          <li key={title} className="card flex gap-5 p-6">
            <span className="display text-4xl font-bold text-royal">{i + 1}</span>
            <div><h2 className="text-lg font-semibold">{title}</h2><p className="mt-1 text-ink-soft">{body}</p></div>
          </li>
        ))}
      </ol>
      <p className="mt-8 rounded-xl border border-crown bg-crown-tint px-4 py-3 text-sm">{A.demo}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/discover" className="btn btn-primary">{t.home.explore}</Link>
        <Link href="/start" className="btn btn-ghost">{t.nav.start}</Link>
      </div>
    </div>
  );
}
