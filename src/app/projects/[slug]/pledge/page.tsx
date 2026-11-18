import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { currentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { getProjectBySlug, pledgeOf, projectState, rewardsFor } from "@/lib/queries";
import { first, Flash, type SP } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).pledge.metaTitle };
}

export default async function PledgePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: SP }) {
  const { slug } = await params;
  const sp = await searchParams;
  const project = getProjectBySlug(slug);
  if (!project || project.status !== "live") notFound();
  const base = `/projects/${project.slug}`;
  const [user, t] = await Promise.all([currentUser(), getT()]);
  if (!user) redirect(`/login?next=${encodeURIComponent(`${base}/pledge`)}`);
  if (projectState(project) !== "live") redirect(`${base}?error=${encodeURIComponent(t.msg.notAccepting)}`);
  if (project.creator_id === user.id) redirect(`${base}?error=${encodeURIComponent(t.msg.ownProject)}`);

  const L = t.pledge;
  const rewards = rewardsFor(project.id);
  const mine = pledgeOf(project.id, user.id);
  const raw = first(sp.reward);
  const selected: number | null =
    raw === "none" ? null : rewards.find((r) => r.id === Number(raw))?.id ?? (raw ? null : mine?.reward_id ?? null);

  const options = [
    { id: null as number | null, title: t.project.noReward, amount: 1, description: t.project.noRewardText, delivery: "", soldOut: false, left: null as number | null },
    ...rewards.map((r) => {
      const left = r.limit_qty === null ? null : Math.max(0, r.limit_qty - r.claimed);
      return { id: r.id as number | null, title: r.title, amount: r.amount, description: r.description, delivery: r.delivery, soldOut: left === 0 && mine?.reward_id !== r.id, left };
    }),
  ];

  return (
    <>
      <Flash sp={sp} />
      <div className="wrap max-w-3xl pt-10">
        <p className="text-sm text-ink-soft"><Link href={base} className="hover:text-royal">← {project.title}</Link></p>
        <h1 className="display mt-2 text-3xl font-bold sm:text-4xl">{mine ? t.project.manage : t.project.back}</h1>
        <p className="mt-2 text-ink-soft">{t.home.by(project.creator_name)}</p>
        {mine && <p className="mt-4 rounded-xl bg-royal-tint px-4 py-3 text-sm font-medium text-royal">{L.current(t.money(mine.amount))}</p>}

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-widest text-ink-soft">{L.selectReward}</h2>
        <ul className="mt-4 space-y-4">
          {options.map((o) => {
            const isSelected = o.id === selected;
            return (
              <li key={o.id ?? "none"} className={`card p-5 ${isSelected ? "!border-royal ring-2 ring-royal/15" : ""} ${o.soldOut ? "opacity-60" : ""}`} data-testid="pledge-option">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{o.title}</p>
                    {o.id !== null && <p className="display text-xl font-bold">{L.orMore(t.money(o.amount))}</p>}
                    {o.description && <p className="mt-1 text-sm text-ink-soft">{o.description}</p>}
                    <p className="mt-2 text-xs text-ink-soft">
                      {o.delivery && L.delivery(o.delivery)}
                      {o.left !== null && <> {o.delivery && "• "}{o.soldOut ? t.project.allGone : L.left(o.left)}</>}
                    </p>
                  </div>
                  {!isSelected && !o.soldOut && (
                    <Link href={o.id === null ? `${base}/pledge?reward=none` : `${base}/pledge?reward=${o.id}`} className="btn btn-ghost">{L.select}</Link>
                  )}
                </div>
                {isSelected && (
                  <form action="/api/pledge" method="post" className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
                    <input type="hidden" name="project_id" value={project.id} />
                    {o.id !== null && <input type="hidden" name="reward_id" value={o.id} />}
                    <div>
                      <label className="label" htmlFor="amount">{L.amount}</label>
                      <input id="amount" name="amount" type="number" inputMode="numeric" min={o.amount} step={1} required
                        defaultValue={mine && mine.amount >= o.amount ? mine.amount : o.amount} className="field !w-40" />
                    </div>
                    <button type="submit" className="btn btn-primary" data-testid="confirm-pledge">{mine ? L.update : L.pledge}</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>

        <p className="mt-6 text-xs leading-5 text-ink-soft">{L.demo(t.date(project.deadline!))}</p>

        {mine && (
          <form action="/api/pledge-cancel" method="post" className="mt-8 border-t border-line pt-6">
            <input type="hidden" name="project_id" value={project.id} />
            <button type="submit" className="btn btn-danger" data-testid="cancel-pledge">{L.cancel}</button>
          </form>
        )}
      </div>
    </>
  );
}
