import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { currentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { getProjectBySlug, projectState, rewardsFor } from "@/lib/queries";
import { Flash, StateBadge, type SP } from "@/components/ui";
import { ProjectFields } from "@/components/ProjectForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).edit.metaTitle };
}

export default async function EditProject({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: SP }) {
  const { slug } = await params;
  const sp = await searchParams;
  const [user, t] = await Promise.all([currentUser(), getT()]);
  if (!user) redirect(`/login?next=${encodeURIComponent(`/projects/${slug}/edit`)}`);
  const project = getProjectBySlug(slug);
  if (!project || project.creator_id !== user.id) notFound();
  const E = t.edit;
  const state = projectState(project);
  const rewards = rewardsFor(project.id);
  const base = `/projects/${project.slug}`;

  return (
    <>
      <Flash sp={sp} />
      <div className="wrap max-w-3xl pt-10">
        <div className="flex flex-wrap items-center gap-3">
          <StateBadge state={state} />
          <Link href={base} className="text-sm font-semibold text-royal hover:underline">{state === "draft" ? E.preview : E.view} →</Link>
        </div>
        <h1 className="display mt-3 text-3xl font-bold sm:text-4xl">{project.title}</h1>

        <section className="card mt-8 p-6">
          <h2 className="display mb-5 text-2xl font-bold">{E.basics}</h2>
          <form action="/api/project-edit" method="post">
            <ProjectFields project={project} />
            <button type="submit" className="btn btn-primary mt-6">{E.saveChanges}</button>
          </form>
        </section>

        <section id="rewards" className="card mt-8 p-6">
          <h2 className="display text-2xl font-bold">{E.rewards}</h2>
          <p className="mt-1 text-sm text-ink-soft">{E.rewardsIntro}</p>
          <ul className="mt-5 space-y-3">
            {rewards.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-4" data-testid="edit-reward">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{t.money(r.amount)} — {r.title}</p>
                  <p className="text-xs text-ink-soft">
                    {E.rowBackers(t.num(r.claimed))}{r.limit_qty !== null && E.rowLimit(r.limit_qty)}{r.delivery && E.rowDelivery(r.delivery)}
                  </p>
                </div>
                {r.claimed === 0 && (
                  <form action="/api/reward-delete" method="post">
                    <input type="hidden" name="project_id" value={project.id} />
                    <input type="hidden" name="reward_id" value={r.id} />
                    <button type="submit" className="btn btn-danger !px-3 !py-1.5">{E.remove}</button>
                  </form>
                )}
              </li>
            ))}
            {rewards.length === 0 && <li className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-soft">{E.noRewards}</li>}
          </ul>
          <form action="/api/reward-add" method="post" className="mt-6 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
            <input type="hidden" name="project_id" value={project.id} />
            <div className="sm:col-span-2"><label className="label" htmlFor="r-title">{E.rewardTitle}</label><input id="r-title" name="title" required maxLength={100} className="field" placeholder={E.rewardTitlePh} /></div>
            <div><label className="label" htmlFor="r-amount">{E.amount}</label><input id="r-amount" name="amount" type="number" min={1} step={1} required className="field" placeholder="25" /></div>
            <div><label className="label" htmlFor="r-limit">{E.limit} <span className="font-normal text-ink-soft">{E.optional}</span></label><input id="r-limit" name="limit_qty" type="number" min={1} step={1} className="field" placeholder={E.unlimited} /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="r-delivery">{E.delivery}</label><input id="r-delivery" name="delivery" maxLength={40} className="field" placeholder={E.deliveryPh} /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="r-desc">{E.description}</label><textarea id="r-desc" name="description" rows={3} maxLength={1000} className="field" /></div>
            <div><button type="submit" className="btn btn-ghost">{E.addReward}</button></div>
          </form>
        </section>

        {state === "draft" && (
          <section className="mt-8 rounded-2xl bg-ink p-6 text-white">
            <h2 className="display text-2xl font-bold">{E.readyTitle}</h2>
            <p className="mt-1 text-sm text-white/70">{E.readyText(project.duration_days, t.money(project.goal))}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <form action="/api/project-launch" method="post">
                <input type="hidden" name="project_id" value={project.id} />
                <button type="submit" className="btn bg-crown text-ink hover:bg-white" data-testid="launch-button">{E.launch}</button>
              </form>
              <form action="/api/project-delete" method="post">
                <input type="hidden" name="project_id" value={project.id} />
                <button type="submit" className="btn border border-white/30 text-white hover:border-white">{E.deleteDraft}</button>
              </form>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
