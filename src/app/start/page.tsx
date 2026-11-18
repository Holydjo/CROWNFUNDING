import Link from "next/link";
import type { Metadata } from "next";
import { currentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { Flash, type SP } from "@/components/ui";
import { ProjectFields } from "@/components/ProjectForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).start.metaTitle };
}

export default async function Start({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const [user, t] = await Promise.all([currentUser(), getT()]);
  const S = t.start;
  return (
    <>
      <Flash sp={sp} />
      <div className="wrap max-w-3xl pt-10">
        <h1 className="display text-3xl font-bold sm:text-5xl">{S.title}</h1>
        <p className="mt-3 text-lg text-ink-soft">{S.intro}</p>
        <ol className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
          {S.steps.map(([title, text], i) => (
            <li key={title} className="card p-4"><p className="display text-2xl font-bold text-royal">{i + 1}</p><p className="font-semibold">{title}</p><p className="text-ink-soft">{text}</p></li>
          ))}
        </ol>
        {user ? (
          <form action="/api/project-create" method="post" className="card mt-8 p-6">
            <ProjectFields />
            <button type="submit" className="btn btn-primary mt-6">{S.save}</button>
          </form>
        ) : (
          <div className="card mt-8 p-8 text-center" data-testid="start-gate">
            <p className="display text-2xl font-bold">{S.gateTitle}</p>
            <p className="mt-2 text-ink-soft">{S.gateText}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/login?next=%2Fstart" className="btn btn-ghost">{t.nav.login}</Link>
              <Link href="/signup?next=%2Fstart" className="btn btn-primary">{t.nav.signup}</Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
