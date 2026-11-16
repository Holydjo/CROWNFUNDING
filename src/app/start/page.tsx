import Link from "next/link";
import type { Metadata } from "next";
import { currentUser } from "@/lib/auth";
import { Flash, type SP } from "@/components/ui";
import { ProjectFields } from "@/components/ProjectForm";

export const metadata: Metadata = { title: "Start a project" };

export default async function Start({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const user = await currentUser();
  return (
    <>
      <Flash sp={sp} />
      <div className="wrap max-w-3xl pt-10">
        <h1 className="display text-3xl font-bold sm:text-5xl">Bring your project to life.</h1>
        <p className="mt-3 text-lg text-ink-soft">Start with the basics. You&apos;ll save a private draft, add rewards, and launch when you&apos;re ready.</p>
        <ol className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
          {[["1", "Draft", "Title, goal, story."], ["2", "Rewards", "What backers get."], ["3", "Launch", "The clock starts."]].map(([n, t, d]) => (
            <li key={n} className="card p-4"><p className="display text-2xl font-bold text-royal">{n}</p><p className="font-semibold">{t}</p><p className="text-ink-soft">{d}</p></li>
          ))}
        </ol>
        {user ? (
          <form action="/api/project-create" method="post" className="card mt-8 p-6">
            <ProjectFields />
            <button type="submit" className="btn btn-primary mt-6">Save draft and continue</button>
          </form>
        ) : (
          <div className="card mt-8 p-8 text-center" data-testid="start-gate">
            <p className="display text-2xl font-bold">Sign in to start a project</p>
            <p className="mt-2 text-ink-soft">You need an account so backers know who they&apos;re supporting.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/login?next=%2Fstart" className="btn btn-ghost">Log in</Link>
              <Link href="/signup?next=%2Fstart" className="btn btn-primary">Sign up</Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
