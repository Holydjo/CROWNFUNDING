import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { currentUser } from "@/lib/auth";
import { categoryBySlug } from "@/lib/categories";
import { dateLabel, money, num, percent, timeLeft } from "@/lib/format";
import {
  commentsFor, counts, faqsFor, getProjectBySlug, isSaved, pledgeOf, projectState, recentBackers, rewardsFor, updatesFor,
  type Project, type Reward,
} from "@/lib/queries";
import { Cover, first, Flash, Progress, RichText, StateBadge, type SP } from "@/components/ui";

type Props = { params: Promise<{ slug: string }>; searchParams: SP };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = getProjectBySlug((await params).slug);
  return p && p.status === "live" ? { title: p.title, description: p.blurb } : { title: "Project" };
}

function RewardCard({ reward, project, canPledge, mine }: { reward: Reward; project: Project; canPledge: boolean; mine: boolean }) {
  const left = reward.limit_qty === null ? null : Math.max(0, reward.limit_qty - reward.claimed);
  const soldOut = left === 0 && !mine;
  return (
    <li className={`card p-5 ${mine ? "!border-royal ring-2 ring-royal/15" : ""}`} data-testid="reward">
      <p className="display text-2xl font-bold">Pledge {money(reward.amount)} or more</p>
      <h4 className="mt-1 text-base font-semibold">{reward.title}</h4>
      {reward.description && <p className="mt-2 text-sm text-ink-soft">{reward.description}</p>}
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-ink-soft">
        {reward.delivery && <div><dt className="uppercase tracking-wide">Estimated delivery</dt><dd className="mt-0.5 text-sm font-medium text-ink">{reward.delivery}</dd></div>}
        <div><dt className="uppercase tracking-wide">Backers</dt><dd className="mt-0.5 text-sm font-medium text-ink">{num(reward.claimed)}</dd></div>
      </dl>
      {left !== null && (
        <p className={`mt-3 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${soldOut ? "bg-line text-ink-soft" : "bg-crown-tint text-ink"}`}>
          {soldOut ? "All gone" : `Limited — ${left} of ${reward.limit_qty} left`}
        </p>
      )}
      {mine && <p className="mt-3 text-sm font-semibold text-royal">Your selected reward</p>}
      {canPledge && !soldOut && (
        <Link href={`/projects/${project.slug}/pledge?reward=${reward.id}`} className="btn btn-primary mt-4 w-full">
          {mine ? "Change pledge" : "Select this reward"}
        </Link>
      )}
    </li>
  );
}

export default async function ProjectPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const project = getProjectBySlug(slug);
  const user = await currentUser();
  if (!project) notFound();
  const isCreator = user?.id === project.creator_id;
  if (project.status !== "live" && !isCreator) notFound();

  const state = projectState(project);
  const pct = percent(project.pledged, project.goal);
  const left = timeLeft(project.deadline);
  const cat = categoryBySlug(project.category);
  const rewards = rewardsFor(project.id);
  const n = counts(project.id);
  const myPledge = user ? pledgeOf(project.id, user.id) : undefined;
  const saved = user ? isSaved(project.id, user.id) : false;
  const canPledge = state === "live" && !isCreator;
  const tab = ["campaign", "rewards", "faq", "updates", "comments", "community"].includes(first(sp.tab)) ? first(sp.tab) : "campaign";
  const base = `/projects/${project.slug}`;

  const tabs: [string, string, number?][] = [
    ["campaign", "Campaign"],
    ["rewards", "Rewards", rewards.length],
    ["faq", "FAQ", n.faqs],
    ["updates", "Updates", n.updates],
    ["comments", "Comments", n.comments],
    ["community", "Community"],
  ];

  return (
    <>
      <Flash sp={sp} />
      <div className="wrap pt-10">
        {state === "draft" && (
          <p className="mb-6 rounded-xl border border-crown bg-crown-tint px-4 py-3 text-sm">
            This is a private preview of your draft. <Link href={`${base}/edit`} className="font-semibold underline">Edit and launch it</Link>.
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
              <Link href={`/discover?category=${cat.slug}`} className="hover:text-royal">{cat.emoji} {cat.name}</Link>
              {project.location && <span>📍 {project.location}</span>}
            </p>
          </div>

          <aside className="flex flex-col" data-testid="funding-box">
            <Progress pledged={project.pledged} goal={project.goal} />
            <p className="display mt-4 text-4xl font-bold text-good" data-testid="pledged">{money(project.pledged)}</p>
            <p className="text-sm text-ink-soft">pledged of {money(project.goal)} goal <span className="font-semibold text-ink" data-testid="percent">({pct}%)</span></p>
            <p className="display mt-4 text-3xl font-bold" data-testid="backers">{num(project.backers)}</p>
            <p className="text-sm text-ink-soft">{project.backers === 1 ? "backer" : "backers"}</p>
            <p className="display mt-4 text-3xl font-bold">{left.value}</p>
            <p className="text-sm text-ink-soft">{left.unit}</p>

            {myPledge && (
              <p className="mt-5 rounded-xl bg-royal-tint px-4 py-3 text-sm font-medium text-royal" data-testid="my-pledge">
                You pledged {money(myPledge.amount)} to this project.
              </p>
            )}
            <div className="mt-5 flex flex-col gap-2">
              {canPledge && (
                <Link href={`${base}/pledge`} className="btn btn-primary w-full !py-3 !text-base" data-testid="back-button">
                  {myPledge ? "Manage your pledge" : "Back this project"}
                </Link>
              )}
              {isCreator && <Link href={`${base}/edit`} className="btn btn-primary w-full">{state === "draft" ? "Edit & launch" : "Edit project"}</Link>}
              {state !== "draft" && (
                <form action="/api/save" method="post">
                  <input type="hidden" name="project_id" value={project.id} />
                  <button type="submit" className="btn btn-ghost w-full" data-testid="save-button">{saved ? "★ Saved" : "☆ Save for later"}</button>
                </form>
              )}
            </div>
            <p className="mt-4 text-xs leading-5 text-ink-soft">
              {state === "live" && <><span className="font-semibold text-ink underline">All or nothing.</span> This project will only be funded if it reaches its goal by {dateLabel(project.deadline!)}.</>}
              {state === "successful" && <>This project was successfully funded on {dateLabel(project.deadline!)}.</>}
              {state === "unsuccessful" && <>This project did not reach its goal by {dateLabel(project.deadline!)}. No backers were charged.</>}
            </p>
            <div className="card mt-5 p-4 text-sm">
              <p className="text-xs uppercase tracking-wide text-ink-soft">Created by</p>
              <Link href={`/profile/${project.creator_id}`} className="mt-1 block font-semibold hover:text-royal">{project.creator_name}</Link>
            </div>
          </aside>
        </div>

        <nav aria-label="Project sections" className="mt-10 flex gap-6 overflow-x-auto border-b border-line text-sm font-semibold">
          {tabs.map(([key, label, count]) => (
            <Link key={key} href={key === "campaign" ? base : `${base}?tab=${key}`} aria-current={tab === key ? "page" : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 pb-3 ${tab === key ? "border-royal text-royal" : "border-transparent text-ink-soft hover:text-ink"}`}>
              {label}{count !== undefined && <span className="ml-1.5 rounded-full bg-line px-1.5 py-0.5 text-xs text-ink-soft">{count}</span>}
            </Link>
          ))}
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2" data-testid={`tab-${tab}`}>
            {tab === "campaign" && (
              <>
                <h2 className="display mb-4 text-3xl font-bold">Story</h2>
                {project.story ? <RichText text={project.story} /> : <p className="text-ink-soft">The creator hasn&apos;t written a story yet.</p>}
                <h2 className="display mb-4 mt-12 text-3xl font-bold">Risks and challenges</h2>
                {project.risks ? <RichText text={project.risks} /> : <p className="text-ink-soft">No risks have been described.</p>}
              </>
            )}

            {tab === "rewards" && (
              <>
                <h2 className="display mb-4 text-3xl font-bold">Rewards</h2>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {rewards.map((r) => <RewardCard key={r.id} reward={r} project={project} canPledge={canPledge} mine={myPledge?.reward_id === r.id} />)}
                </ul>
                {rewards.length === 0 && <p className="text-ink-soft">This project has no reward tiers.</p>}
              </>
            )}

            {tab === "faq" && (
              <>
                <h2 className="display mb-4 text-3xl font-bold">Frequently asked questions</h2>
                <div className="space-y-3">
                  {faqsFor(project.id).map((f) => (
                    <details key={f.id} className="card p-5" data-testid="faq">
                      <summary className="cursor-pointer font-semibold">{f.question}</summary>
                      <p className="mt-3 whitespace-pre-line text-sm text-ink-soft">{f.answer}</p>
                    </details>
                  ))}
                  {n.faqs === 0 && <p className="text-ink-soft">No questions answered yet.</p>}
                </div>
                {isCreator && (
                  <form action="/api/faq" method="post" className="card mt-6 space-y-3 p-5">
                    <input type="hidden" name="project_id" value={project.id} />
                    <p className="font-semibold">Add a question</p>
                    <input name="question" required maxLength={200} placeholder="Question" className="field" />
                    <textarea name="answer" required maxLength={2000} rows={3} placeholder="Answer" className="field" />
                    <button className="btn btn-primary" type="submit">Add to FAQ</button>
                  </form>
                )}
              </>
            )}

            {tab === "updates" && (
              <>
                <h2 className="display mb-4 text-3xl font-bold">Updates</h2>
                {isCreator && state !== "draft" && (
                  <form action="/api/update" method="post" className="card mb-6 space-y-3 p-5">
                    <input type="hidden" name="project_id" value={project.id} />
                    <p className="font-semibold">Post an update to your backers</p>
                    <input name="title" required maxLength={120} placeholder="Title" className="field" />
                    <textarea name="body" required maxLength={10000} rows={5} placeholder="What's new?" className="field" />
                    <button className="btn btn-primary" type="submit">Publish update</button>
                  </form>
                )}
                <ol className="space-y-4">
                  {updatesFor(project.id).map((u, i, arr) => (
                    <li key={u.id} className="card p-6" data-testid="update">
                      <p className="text-xs font-semibold uppercase tracking-wide text-royal">Update #{arr.length - i} • {dateLabel(u.created_at)}</p>
                      <h3 className="display mt-2 text-2xl font-bold">{u.title}</h3>
                      <p className="mt-3 whitespace-pre-line text-[15px] leading-7">{u.body}</p>
                    </li>
                  ))}
                </ol>
                {n.updates === 0 && <p className="text-ink-soft">No updates yet.</p>}
              </>
            )}

            {tab === "comments" && (
              <>
                <h2 className="display mb-4 text-3xl font-bold">Comments</h2>
                {user && (isCreator || myPledge) && state !== "draft" ? (
                  <form action="/api/comment" method="post" className="card mb-6 space-y-3 p-5">
                    <input type="hidden" name="project_id" value={project.id} />
                    <label className="label" htmlFor="comment-body">Leave a comment</label>
                    <textarea id="comment-body" name="body" required maxLength={2000} rows={3} className="field" />
                    <button className="btn btn-primary" type="submit">Post comment</button>
                  </form>
                ) : (
                  <p className="card mb-6 p-4 text-sm text-ink-soft" data-testid="comment-gate">Only backers can post comments. {!user && <Link href={`/login?next=${encodeURIComponent(base + "?tab=comments")}`} className="font-semibold text-royal">Log in</Link>}</p>
                )}
                <ul className="space-y-4">
                  {commentsFor(project.id).map((c) => (
                    <li key={c.id} className="card p-5" data-testid="comment">
                      <p className="text-sm">
                        <Link href={`/profile/${c.user_id}`} className="font-semibold hover:text-royal">{c.user_name}</Link>
                        {c.is_creator ? <span className="ml-2 rounded-full bg-royal px-2 py-0.5 text-xs font-semibold text-white">Creator</span> : null}
                        <span className="ml-2 text-ink-soft">{dateLabel(c.created_at)}</span>
                      </p>
                      <p className="mt-2 whitespace-pre-line text-[15px]">{c.body}</p>
                    </li>
                  ))}
                </ul>
                {n.comments === 0 && <p className="text-ink-soft">No comments yet.</p>}
              </>
            )}

            {tab === "community" && (
              <>
                <h2 className="display mb-4 text-3xl font-bold">Community</h2>
                <p className="text-ink-soft">{num(project.backers)} {project.backers === 1 ? "person is" : "people are"} backing this project.</p>
                <h3 className="mb-3 mt-6 font-semibold">Most recent backers</h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {recentBackers(project.id).map((b) => (
                    <li key={b.id} className="card flex items-center gap-3 p-3 text-sm">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-royal-tint font-bold text-royal">{b.name.slice(0, 1)}</span>
                      <Link href={`/profile/${b.id}`} className="font-medium hover:text-royal">{b.name}</Link>
                      <span className="ml-auto text-xs text-ink-soft">{dateLabel(b.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <aside>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-ink-soft">Support</h2>
            <ul className="space-y-4">
              {canPledge && (
                <li className="card p-5">
                  <p className="font-semibold">Pledge without a reward</p>
                  <p className="mt-1 text-sm text-ink-soft">Back it because you believe in it.</p>
                  <Link href={`${base}/pledge`} className="btn btn-ghost mt-4 w-full">Continue</Link>
                </li>
              )}
              {tab !== "rewards" && rewards.map((r) => <RewardCard key={r.id} reward={r} project={project} canPledge={canPledge} mine={myPledge?.reward_id === r.id} />)}
            </ul>
          </aside>
        </div>
      </div>
    </>
  );
}
