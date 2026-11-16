import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { currentUser } from "@/lib/auth";
import { money, num } from "@/lib/format";
import { getProjectBySlug, projectState, rewardsFor } from "@/lib/queries";
import { Flash, StateBadge, type SP } from "@/components/ui";
import { ProjectFields } from "@/components/ProjectForm";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProject({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: SP }) {
  const { slug } = await params;
  const sp = await searchParams;
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/projects/${slug}/edit`)}`);
  const project = getProjectBySlug(slug);
  if (!project || project.creator_id !== user.id) notFound();
  const state = projectState(project);
  const rewards = rewardsFor(project.id);
  const base = `/projects/${project.slug}`;

  return (
    <>
      <Flash sp={sp} />
      <div className="wrap max-w-3xl pt-10">
        <div className="flex flex-wrap items-center gap-3">
          <StateBadge state={state} />
          <Link href={base} className="text-sm font-semibold text-royal hover:underline">{state === "draft" ? "Preview" : "View project"} →</Link>
        </div>
        <h1 className="display mt-3 text-3xl font-bold sm:text-4xl">{project.title}</h1>

        <section className="card mt-8 p-6">
          <h2 className="display mb-5 text-2xl font-bold">Basics</h2>
          <form action="/api/project-edit" method="post">
            <ProjectFields project={project} />
            <button type="submit" className="btn btn-primary mt-6">Save changes</button>
          </form>
        </section>

        <section id="rewards" className="card mt-8 p-6">
          <h2 className="display text-2xl font-bold">Rewards</h2>
          <p className="mt-1 text-sm text-ink-soft">Offer backers something in return at different pledge levels.</p>
          <ul className="mt-5 space-y-3">
            {rewards.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-4" data-testid="edit-reward">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{money(r.amount)} — {r.title}</p>
                  <p className="text-xs text-ink-soft">
                    {num(r.claimed)} backers{r.limit_qty !== null && ` • limit ${r.limit_qty}`}{r.delivery && ` • delivery ${r.delivery}`}
                  </p>
                </div>
                {r.claimed === 0 && (
                  <form action="/api/reward-delete" method="post">
                    <input type="hidden" name="project_id" value={project.id} />
                    <input type="hidden" name="reward_id" value={r.id} />
                    <button type="submit" className="btn btn-danger !px-3 !py-1.5">Remove</button>
                  </form>
                )}
              </li>
            ))}
            {rewards.length === 0 && <li className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-soft">No rewards yet. Add at least one before launching.</li>}
          </ul>
          <form action="/api/reward-add" method="post" className="mt-6 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
            <input type="hidden" name="project_id" value={project.id} />
            <div className="sm:col-span-2"><label className="label" htmlFor="r-title">Reward title</label><input id="r-title" name="title" required maxLength={100} className="field" placeholder="Signed first edition" /></div>
            <div><label className="label" htmlFor="r-amount">Pledge amount (USD)</label><input id="r-amount" name="amount" type="number" min={1} step={1} required className="field" placeholder="25" /></div>
            <div><label className="label" htmlFor="r-limit">Backer limit <span className="font-normal text-ink-soft">(optional)</span></label><input id="r-limit" name="limit_qty" type="number" min={1} step={1} className="field" placeholder="Unlimited" /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="r-delivery">Estimated delivery</label><input id="r-delivery" name="delivery" maxLength={40} className="field" placeholder="June 2027" /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="r-desc">Description</label><textarea id="r-desc" name="description" rows={3} maxLength={1000} className="field" /></div>
            <div><button type="submit" className="btn btn-ghost">Add reward</button></div>
          </form>
        </section>

        {state === "draft" && (
          <section className="mt-8 rounded-2xl bg-ink p-6 text-white">
            <h2 className="display text-2xl font-bold">Ready to launch?</h2>
            <p className="mt-1 text-sm text-white/70">
              Launching makes your project public and starts the {project.duration_days}-day clock. Your goal of {money(project.goal)} can&apos;t be changed afterwards.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <form action="/api/project-launch" method="post">
                <input type="hidden" name="project_id" value={project.id} />
                <button type="submit" className="btn bg-crown text-ink hover:bg-white" data-testid="launch-button">Launch project</button>
              </form>
              <form action="/api/project-delete" method="post">
                <input type="hidden" name="project_id" value={project.id} />
                <button type="submit" className="btn border border-white/30 text-white hover:border-white">Delete draft</button>
              </form>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
