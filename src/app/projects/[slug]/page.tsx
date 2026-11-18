import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { currentUser } from "@/lib/auth";
import { categoryBySlug } from "@/lib/categories";
import { percent } from "@/lib/format";
import { getT, type T } from "@/lib/i18n";
import {
  commentsFor, counts, faqsFor, getProjectBySlug, isSaved, pledgeOf, projectState, recentBackers, rewardsFor, updatesFor,
  type Project, type Reward,
} from "@/lib/queries";
import { Cover, first, Flash, Progress, RichText, StateBadge, type SP } from "@/components/ui";

type Props = { params: Promise<{ slug: string }>; searchParams: SP };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = getProjectBySlug((await params).slug);
  return p && p.status === "live" ? { title: p.title, description: p.blurb } : { title: (await getT()).project.metaFallback };
}

function RewardCard({ reward, project, canPledge, mine, t }: { reward: Reward; project: Project; canPledge: boolean; mine: boolean; t: T }) {
  const left = reward.limit_qty === null ? null : Math.max(0, reward.limit_qty - reward.claimed);
  const soldOut = left === 0 && !mine;
  return (
    <li className={`card p-5 ${mine ? "!border-royal ring-2 ring-royal/15" : ""}`} data-testid="reward">
      <p className="display text-2xl font-bold">{t.project.pledgeOrMore(t.money(reward.amount))}</p>
      <h4 className="mt-1 text-base font-semibold">{reward.title}</h4>
      {reward.description && <p className="mt-2 text-sm text-ink-soft">{reward.description}</p>}
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-ink-soft">
        {reward.delivery && <div><dt className="uppercase tracking-wide">{t.project.estDelivery}</dt><dd className="mt-0.5 text-sm font-medium text-ink">{reward.delivery}</dd></div>}
        <div><dt className="uppercase tracking-wide">{t.project.backersLabel}</dt><dd className="mt-0.5 text-sm font-medium text-ink">{t.num(reward.claimed)}</dd></div>
      </dl>
      {left !== null && (
        <p className={`mt-3 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${soldOut ? "bg-line text-ink-soft" : "bg-crown-tint text-ink"}`}>
          {soldOut ? t.project.allGone : t.project.limited(left, reward.limit_qty!)}
        </p>
      )}
      {mine && <p className="mt-3 text-sm font-semibold text-royal">{t.project.yourReward}</p>}
      {canPledge && !soldOut && (
        <Link href={`/projects/${project.slug}/pledge?reward=${reward.id}`} className="btn btn-primary mt-4 w-full">
          {mine ? t.project.changePledge : t.project.selectReward}
        </Link>
      )}
    </li>
  );
}

export default async function ProjectPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const project = getProjectBySlug(slug);
  const [user, t] = await Promise.all([currentUser(), getT()]);
  if (!project) notFound();
  const isCreator = user?.id === project.creator_id;
  if (project.status !== "live" && !isCreator) notFound();

  const P = t.project;
  const state = projectState(project);
  const pct = percent(project.pledged, project.goal);
  const left = t.timeLeft(project.deadline);
  const cat = categoryBySlug(project.category);
  const rewards = rewardsFor(project.id);
  const n = counts(project.id);
  const myPledge = user ? pledgeOf(project.id, user.id) : undefined;
  const saved = user ? isSaved(project.id, user.id) : false;
  const canPledge = state === "live" && !isCreator;
  const tab = ["campaign", "rewards", "faq", "updates", "comments", "community"].includes(first(sp.tab)) ? first(sp.tab) : "campaign";
  const base = `/projects/${project.slug}`;
  const deadline = project.deadline ? t.date(project.deadline) : "";

  const tabs: [string, number?][] = [
    ["campaign"],
    ["rewards", rewards.length],
    ["faq", n.faqs],
    ["updates", n.updates],
    ["comments", n.comments],
    ["community"],
  ];

  return (
    <>
      <Flash sp={sp} />
      <div className="wrap pt-10">
        {state === "draft" && (
          <p className="mb-6 rounded-xl border border-crown bg-crown-tint px-4 py-3 text-sm">
            {P.draftBanner} <Link href={`${base}/edit`} className="font-semibold underline">{P.draftBannerLink}</Link>.
          </p>
        )}
        <div className="text-center">
          <StateBadge state={state} />
          <h1 className="display mx-auto mt-3 max-w-3xl text-3xl font-bold leading-tight sm:text-5xl" data-testid="project-title">{project.title}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-ink-soft">{project.blurb}</p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="aspect-video overflow-hidden rounded-2xl border border-line"><Cover project={project} /></div>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
              <Link href={`/discover?category=${cat.slug}`} className="hover:text-royal">{cat.emoji} {t.category(cat.slug)}</Link>
              {project.location && <span>📍 {project.location}</span>}
            </p>
          </div>

          <aside className="flex flex-col" data-testid="funding-box">
            <Progress pledged={project.pledged} goal={project.goal} />
            <p className="display mt-4 text-4xl font-bold text-good" data-testid="pledged">{t.money(project.pledged)}</p>
            <p className="text-sm text-ink-soft">{P.pledgedOf(t.money(project.goal))} <span className="font-semibold text-ink" data-testid="percent">({t.locale === "fr" ? `${pct} %` : `${pct}%`})</span></p>
            <p className="display mt-4 text-3xl font-bold" data-testid="backers">{t.num(project.backers)}</p>
            <p className="text-sm text-ink-soft">{P.backerWord(project.backers)}</p>
            <p className="display mt-4 text-3xl font-bold">{left.value}</p>
            <p className="text-sm text-ink-soft">{left.unit}</p>

            {myPledge && (
              <p className="mt-5 rounded-xl bg-royal-tint px-4 py-3 text-sm font-medium text-royal" data-testid="my-pledge">
                {P.youPledged(t.money(myPledge.amount))}
              </p>
            )}
            <div className="mt-5 flex flex-col gap-2">
              {canPledge && (
                <Link href={`${base}/pledge`} className="btn btn-primary w-full !py-3 !text-base" data-testid="back-button">
                  {myPledge ? P.manage : P.back}
                </Link>
              )}
              {isCreator && <Link href={`${base}/edit`} className="btn btn-primary w-full">{state === "draft" ? P.editLaunch : P.edit}</Link>}
              {state !== "draft" && (
                <form action="/api/save" method="post">
                  <input type="hidden" name="project_id" value={project.id} />
                  <button type="submit" className="btn btn-ghost w-full" data-testid="save-button">{saved ? P.saved : P.save}</button>
                </form>
              )}
            </div>
            <p className="mt-4 text-xs leading-5 text-ink-soft">
              {state === "live" && <><span className="font-semibold text-ink underline">{P.aonTitle}</span>{P.aonText(deadline)}</>}
              {state === "successful" && P.successText(deadline)}
              {state === "unsuccessful" && P.failText(deadline)}
            </p>
            <div className="card mt-5 p-4 text-sm">
              <p className="text-xs uppercase tracking-wide text-ink-soft">{P.createdBy}</p>
              <Link href={`/profile/${project.creator_id}`} className="mt-1 block font-semibold hover:text-royal">{project.creator_name}</Link>
            </div>
          </aside>
        </div>

        <nav aria-label={P.sections} className="mt-10 flex gap-6 overflow-x-auto border-b border-line text-sm font-semibold">
          {tabs.map(([key, count]) => (
            <Link key={key} href={key === "campaign" ? base : `${base}?tab=${key}`} aria-current={tab === key ? "page" : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 pb-3 ${tab === key ? "border-royal text-royal" : "border-transparent text-ink-soft hover:text-ink"}`}>
              {P.tabs[key]}{count !== undefined && <span className="ml-1.5 rounded-full bg-line px-1.5 py-0.5 text-xs text-ink-soft">{count}</span>}
            </Link>
          ))}
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2" data-testid={`tab-${tab}`}>
            {tab === "campaign" && (
              <>
                <h2 className="display mb-4 text-3xl font-bold">{P.story}</h2>
                {project.story ? <RichText text={project.story} /> : <p className="text-ink-soft">{P.noStory}</p>}
                <h2 className="display mb-4 mt-12 text-3xl font-bold">{P.risks}</h2>
                {project.risks ? <RichText text={project.risks} /> : <p className="text-ink-soft">{P.noRisks}</p>}
              </>
            )}

            {tab === "rewards" && (
              <>
                <h2 className="display mb-4 text-3xl font-bold">{P.rewardsTitle}</h2>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {rewards.map((r) => <RewardCard key={r.id} reward={r} project={project} canPledge={canPledge} mine={myPledge?.reward_id === r.id} t={t} />)}
                </ul>
                {rewards.length === 0 && <p className="text-ink-soft">{P.noRewards}</p>}
              </>
            )}

            {tab === "faq" && (
              <>
                <h2 className="display mb-4 text-3xl font-bold">{P.faqTitle}</h2>
                <div className="space-y-3">
                  {faqsFor(project.id).map((f) => (
                    <details key={f.id} className="card p-5" data-testid="faq">
                      <summary className="cursor-pointer font-semibold">{f.question}</summary>
                      <p className="mt-3 whitespace-pre-line text-sm text-ink-soft">{f.answer}</p>
                    </details>
                  ))}
                  {n.faqs === 0 && <p className="text-ink-soft">{P.noFaq}</p>}
                </div>
                {isCreator && (
                  <form action="/api/faq" method="post" className="card mt-6 space-y-3 p-5">
                    <input type="hidden" name="project_id" value={project.id} />
                    <p className="font-semibold">{P.addQuestion}</p>
                    <input name="question" required maxLength={200} placeholder={P.question} aria-label={P.question} className="field" />
                    <textarea name="answer" required maxLength={2000} rows={3} placeholder={P.answer} aria-label={P.answer} className="field" />
                    <button className="btn btn-primary" type="submit">{P.addFaq}</button>
                  </form>
                )}
              </>
            )}

            {tab === "updates" && (
              <>
                <h2 className="display mb-4 text-3xl font-bold">{P.updatesTitle}</h2>
                {isCreator && state !== "draft" && (
                  <form action="/api/update" method="post" className="card mb-6 space-y-3 p-5">
                    <input type="hidden" name="project_id" value={project.id} />
                    <p className="font-semibold">{P.postUpdate}</p>
                    <input name="title" required maxLength={120} placeholder={P.updateTitle} aria-label={P.updateTitle} className="field" />
                    <textarea name="body" required maxLength={10000} rows={5} placeholder={P.whatsNew} aria-label={P.whatsNew} className="field" />
                    <button className="btn btn-primary" type="submit">{P.publish}</button>
                  </form>
                )}
                <ol className="space-y-4">
                  {updatesFor(project.id).map((u, i, arr) => (
                    <li key={u.id} className="card p-6" data-testid="update">
                      <p className="text-xs font-semibold uppercase tracking-wide text-royal">{P.updateN(arr.length - i, t.date(u.created_at))}</p>
                      <h3 className="display mt-2 text-2xl font-bold">{u.title}</h3>
                      <p className="mt-3 whitespace-pre-line text-[15px] leading-7">{u.body}</p>
                    </li>
                  ))}
                </ol>
                {n.updates === 0 && <p className="text-ink-soft">{P.noUpdates}</p>}
              </>
            )}

            {tab === "comments" && (
              <>
                <h2 className="display mb-4 text-3xl font-bold">{P.commentsTitle}</h2>
                {user && (isCreator || myPledge) && state !== "draft" ? (
                  <form action="/api/comment" method="post" className="card mb-6 space-y-3 p-5">
                    <input type="hidden" name="project_id" value={project.id} />
                    <label className="label" htmlFor="comment-body">{P.leaveComment}</label>
                    <textarea id="comment-body" name="body" required maxLength={2000} rows={3} className="field" />
                    <button className="btn btn-primary" type="submit">{P.postComment}</button>
                  </form>
                ) : (
                  <p className="card mb-6 p-4 text-sm text-ink-soft" data-testid="comment-gate">
                    {P.backersOnly}{" "}
                    {!user && <Link href={`/login?next=${encodeURIComponent(base + "?tab=comments")}`} className="font-semibold text-royal">{P.login}</Link>}
                  </p>
                )}
                <ul className="space-y-4">
                  {commentsFor(project.id).map((c) => (
                    <li key={c.id} className="card p-5" data-testid="comment">
                      <p className="text-sm">
                        <Link href={`/profile/${c.user_id}`} className="font-semibold hover:text-royal">{c.user_name}</Link>
                        {c.is_creator ? <span className="ml-2 rounded-full bg-royal px-2 py-0.5 text-xs font-semibold text-white" data-testid="creator-badge">{P.creator}</span> : null}
                        <span className="ml-2 text-ink-soft">{t.date(c.created_at)}</span>
                      </p>
                      <p className="mt-2 whitespace-pre-line text-[15px]">{c.body}</p>
                    </li>
                  ))}
                </ul>
                {n.comments === 0 && <p className="text-ink-soft">{P.noComments}</p>}
              </>
            )}

            {tab === "community" && (
              <>
                <h2 className="display mb-4 text-3xl font-bold">{P.communityTitle}</h2>
                <p className="text-ink-soft">{P.backingCount(project.backers, t.num(project.backers))}</p>
                <h3 className="mb-3 mt-6 font-semibold">{P.recentBackers}</h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {recentBackers(project.id).map((b) => (
                    <li key={b.id} className="card flex items-center gap-3 p-3 text-sm">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-royal-tint font-bold text-royal">{b.name.slice(0, 1)}</span>
                      <Link href={`/profile/${b.id}`} className="font-medium hover:text-royal">{b.name}</Link>
                      <span className="ml-auto text-xs text-ink-soft">{t.date(b.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <aside>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-ink-soft">{P.support}</h2>
            <ul className="space-y-4">
              {canPledge && (
                <li className="card p-5">
                  <p className="font-semibold">{P.noReward}</p>
                  <p className="mt-1 text-sm text-ink-soft">{P.noRewardText}</p>
                  <Link href={`${base}/pledge`} className="btn btn-ghost mt-4 w-full">{P.continue}</Link>
                </li>
              )}
              {tab !== "rewards" && rewards.map((r) => <RewardCard key={r.id} reward={r} project={project} canPledge={canPledge} mine={myPledge?.reward_id === r.id} t={t} />)}
            </ul>
          </aside>
        </div>
      </div>
    </>
  );
}
