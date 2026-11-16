import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { currentUser, endSession, startSession, type User } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { readForm, safeNext, sameOrigin, seeOther, type Form } from "@/lib/http";
import { isCategory } from "@/lib/categories";
import { slugify } from "@/lib/seed";
import { getProjectById, getReward, pledgeOf, projectState, rewardsFor, uniqueSlug, type Project } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Ctx = { form: Form; user: User | null };
type Authed = { form: Form; user: User };

const DAY = 86_400_000;
const MAX_AMOUNT = 10_000_000;

function projectFromForm(form: Form): Project | undefined {
  const id = form.int("project_id");
  return id === null ? undefined : getProjectById(id);
}

/** A project is visible to everyone once launched; drafts only to their creator. */
function visible(p: Project | undefined, user: User | null): p is Project {
  return !!p && (p.status === "live" || p.creator_id === user?.id);
}

function readBasics(form: Form) {
  const title = form.str("title", 120);
  const blurb = form.str("blurb", 200);
  const category = form.str("category", 40);
  const location = form.str("location", 80);
  const image_url = form.str("image_url", 500);
  const story = form.str("story", 20000);
  const risks = form.str("risks", 5000);
  const goal = form.int("goal");
  const duration = form.int("duration_days");
  let error = "";
  if (title.length < 3) error = "Give your project a title of at least 3 characters.";
  else if (!isCategory(category)) error = "Choose a category.";
  else if (goal === null || goal < 1 || goal > MAX_AMOUNT) error = "Set a funding goal between $1 and $10,000,000.";
  else if (duration === null || duration < 1 || duration > 60) error = "Campaigns run between 1 and 60 days.";
  else if (image_url && !/^https:\/\/[^\s"'<>]+$/i.test(image_url)) error = "The image must be an https:// URL.";
  return { error, title, blurb, category, location, image_url, story, risks, goal: goal ?? 0, duration: duration ?? 30 };
}

const publicActions: Record<string, (ctx: Ctx) => Promise<NextResponse> | NextResponse> = {
  async signup({ form }) {
    const name = form.str("name", 60);
    const email = form.str("email", 200).toLowerCase();
    const password = form.str("password", 200);
    const next = safeNext(form.str("next", 500));
    const back = `/signup?next=${encodeURIComponent(next)}`;
    if (name.length < 2) return seeOther(back, { error: "Please enter your name." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return seeOther(back, { error: "Please enter a valid email address." });
    if (password.length < 8) return seeOther(back, { error: "Your password needs at least 8 characters." });
    const db = getDb();
    if (db.prepare("SELECT 1 AS x FROM users WHERE email = ?").get(email))
      return seeOther(back, { error: "An account with that email already exists." });
    const r = db
      .prepare("INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)")
      .run(name, email, hashPassword(password), Date.now());
    await startSession(Number(r.lastInsertRowid));
    return seeOther(next, { notice: `Welcome to Crownfunding, ${name}!` });
  },

  async login({ form }) {
    const email = form.str("email", 200).toLowerCase();
    const password = form.str("password", 200);
    const next = safeNext(form.str("next", 500));
    const row = getDb().prepare("SELECT id, password_hash FROM users WHERE email = ?").get(email) as
      | { id: number; password_hash: string }
      | undefined;
    if (!row || !verifyPassword(password, row.password_hash))
      return seeOther(`/login?next=${encodeURIComponent(next)}`, { error: "That email and password don't match." });
    await startSession(row.id);
    return seeOther(next);
  },

  async logout() {
    await endSession();
    return seeOther("/");
  },
};

const userActions: Record<string, (ctx: Authed) => Promise<NextResponse> | NextResponse> = {
  pledge({ form, user }) {
    const p = projectFromForm(form);
    if (!visible(p, user)) return seeOther("/discover", { error: "That project doesn't exist." });
    const page = `/projects/${p.slug}`;
    if (projectState(p) !== "live") return seeOther(page, { error: "This campaign is not accepting pledges." });
    if (p.creator_id === user.id) return seeOther(page, { error: "You can't back your own project." });
    const amount = form.int("amount");
    const rewardId = form.int("reward_id");
    const back = `${page}/pledge${rewardId ? `?reward=${rewardId}` : ""}`;
    if (amount === null || amount < 1 || amount > MAX_AMOUNT)
      return seeOther(back, { error: "Enter a pledge amount of at least $1." });
    const existing = pledgeOf(p.id, user.id);
    if (rewardId !== null) {
      const reward = getReward(rewardId);
      if (!reward || reward.project_id !== p.id) return seeOther(back, { error: "That reward doesn't exist." });
      if (amount < reward.amount)
        return seeOther(back, { error: `This reward needs a pledge of at least $${reward.amount}.` });
      const claimedByOthers = reward.claimed - (existing?.reward_id === reward.id ? 1 : 0);
      if (reward.limit_qty !== null && claimedByOthers >= reward.limit_qty)
        return seeOther(back, { error: "That reward is no longer available." });
    }
    const db = getDb();
    if (existing) {
      db.prepare("UPDATE pledges SET amount = ?, reward_id = ? WHERE id = ?").run(amount, rewardId, existing.id);
      return seeOther(page, { notice: `Your pledge is now $${amount}.` });
    }
    db.prepare("INSERT INTO pledges (project_id, user_id, reward_id, amount, created_at) VALUES (?, ?, ?, ?, ?)").run(
      p.id,
      user.id,
      rewardId,
      amount,
      Date.now()
    );
    return seeOther(page, { notice: `Thank you! You pledged $${amount}. You'll only be charged if the project reaches its goal.` });
  },

  "pledge-cancel"({ form, user }) {
    const p = projectFromForm(form);
    if (!visible(p, user)) return seeOther("/discover", { error: "That project doesn't exist." });
    const page = `/projects/${p.slug}`;
    if (projectState(p) !== "live") return seeOther(page, { error: "Pledges can't be changed after a campaign ends." });
    getDb().prepare("DELETE FROM pledges WHERE project_id = ? AND user_id = ?").run(p.id, user.id);
    return seeOther(page, { notice: "Your pledge has been cancelled." });
  },

  save({ form, user }) {
    const p = projectFromForm(form);
    if (!visible(p, user)) return seeOther("/discover", { error: "That project doesn't exist." });
    const db = getDb();
    const had = db.prepare("DELETE FROM saves WHERE project_id = ? AND user_id = ?").run(p.id, user.id).changes;
    if (!had) db.prepare("INSERT INTO saves (user_id, project_id, created_at) VALUES (?, ?, ?)").run(user.id, p.id, Date.now());
    return seeOther(`/projects/${p.slug}`, { notice: had ? "Removed from your saved projects." : "Saved. Find it any time in your dashboard." });
  },

  comment({ form, user }) {
    const p = projectFromForm(form);
    if (!visible(p, user) || p.status !== "live") return seeOther("/discover", { error: "That project doesn't exist." });
    const page = `/projects/${p.slug}?tab=comments`;
    const body = form.str("body", 2000);
    if (!body) return seeOther(page, { error: "Write something before posting." });
    if (p.creator_id !== user.id && !pledgeOf(p.id, user.id))
      return seeOther(page, { error: "Only backers can post comments." });
    getDb().prepare("INSERT INTO comments (project_id, user_id, body, created_at) VALUES (?, ?, ?, ?)").run(p.id, user.id, body, Date.now());
    return seeOther(page, { notice: "Comment posted." });
  },

  update({ form, user }) {
    const p = projectFromForm(form);
    if (!p || p.creator_id !== user.id || p.status !== "live") return seeOther("/dashboard", { error: "Only the creator of a launched project can post updates." });
    const page = `/projects/${p.slug}?tab=updates`;
    const title = form.str("title", 120);
    const body = form.str("body", 10000);
    if (!title || !body) return seeOther(page, { error: "An update needs a title and a body." });
    getDb().prepare("INSERT INTO updates (project_id, title, body, created_at) VALUES (?, ?, ?, ?)").run(p.id, title, body, Date.now());
    return seeOther(page, { notice: "Update published." });
  },

  faq({ form, user }) {
    const p = projectFromForm(form);
    if (!p || p.creator_id !== user.id) return seeOther("/dashboard", { error: "Only the creator can edit the FAQ." });
    const page = `/projects/${p.slug}?tab=faq`;
    const question = form.str("question", 200);
    const answer = form.str("answer", 2000);
    if (!question || !answer) return seeOther(page, { error: "Add both a question and an answer." });
    getDb().prepare("INSERT INTO faqs (project_id, question, answer) VALUES (?, ?, ?)").run(p.id, question, answer);
    return seeOther(page, { notice: "FAQ added." });
  },

  "project-create"({ form, user }) {
    const b = readBasics(form);
    if (b.error) return seeOther("/start", { error: b.error });
    const slug = uniqueSlug(slugify(b.title));
    getDb()
      .prepare(
        `INSERT INTO projects (slug, creator_id, title, blurb, category, location, image_url, story, risks, goal, duration_days, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`
      )
      .run(slug, user.id, b.title, b.blurb, b.category, b.location, b.image_url, b.story, b.risks, b.goal, b.duration, Date.now());
    return seeOther(`/projects/${slug}/edit`, { notice: "Draft saved. Add rewards, then launch when you're ready." });
  },

  "project-edit"({ form, user }) {
    const p = projectFromForm(form);
    if (!p || p.creator_id !== user.id) return seeOther("/dashboard", { error: "You can only edit your own projects." });
    const page = `/projects/${p.slug}/edit`;
    const b = readBasics(form);
    if (b.error) return seeOther(page, { error: b.error });
    if (p.status === "live") {
      // Like any all-or-nothing platform: goal and deadline are locked once live.
      getDb()
        .prepare("UPDATE projects SET blurb = ?, location = ?, image_url = ?, story = ?, risks = ? WHERE id = ?")
        .run(b.blurb, b.location, b.image_url, b.story, b.risks, p.id);
    } else {
      getDb()
        .prepare(
          "UPDATE projects SET title = ?, blurb = ?, category = ?, location = ?, image_url = ?, story = ?, risks = ?, goal = ?, duration_days = ? WHERE id = ?"
        )
        .run(b.title, b.blurb, b.category, b.location, b.image_url, b.story, b.risks, b.goal, b.duration, p.id);
    }
    return seeOther(page, { notice: "Changes saved." });
  },

  "reward-add"({ form, user }) {
    const p = projectFromForm(form);
    if (!p || p.creator_id !== user.id) return seeOther("/dashboard", { error: "You can only edit your own projects." });
    const page = `/projects/${p.slug}/edit#rewards`;
    const title = form.str("title", 100);
    const amount = form.int("amount");
    const limitRaw = form.str("limit_qty", 10);
    const limit = limitRaw === "" ? null : form.int("limit_qty");
    if (!title) return seeOther(page, { error: "Give the reward a title." });
    if (amount === null || amount < 1 || amount > MAX_AMOUNT) return seeOther(page, { error: "Set a pledge amount of at least $1." });
    if (limitRaw !== "" && (limit === null || limit < 1)) return seeOther(page, { error: "The backer limit must be a positive number." });
    getDb()
      .prepare("INSERT INTO rewards (project_id, title, description, amount, delivery, limit_qty) VALUES (?, ?, ?, ?, ?, ?)")
      .run(p.id, title, form.str("description", 1000), amount, form.str("delivery", 40), limit);
    return seeOther(page, { notice: "Reward added." });
  },

  "reward-delete"({ form, user }) {
    const p = projectFromForm(form);
    if (!p || p.creator_id !== user.id) return seeOther("/dashboard", { error: "You can only edit your own projects." });
    const page = `/projects/${p.slug}/edit#rewards`;
    const reward = getReward(form.int("reward_id") ?? -1);
    if (!reward || reward.project_id !== p.id) return seeOther(page, { error: "That reward doesn't exist." });
    if (reward.claimed > 0) return seeOther(page, { error: "A reward that backers have already chosen can't be removed." });
    getDb().prepare("DELETE FROM rewards WHERE id = ?").run(reward.id);
    return seeOther(page, { notice: "Reward removed." });
  },

  "project-launch"({ form, user }) {
    const p = projectFromForm(form);
    if (!p || p.creator_id !== user.id) return seeOther("/dashboard", { error: "You can only launch your own projects." });
    const page = `/projects/${p.slug}/edit`;
    if (p.status === "live") return seeOther(`/projects/${p.slug}`);
    if (!p.blurb) return seeOther(page, { error: "Add a short blurb before launching." });
    if (p.story.length < 20) return seeOther(page, { error: "Tell your story (at least a few sentences) before launching." });
    if (rewardsFor(p.id).length === 0) return seeOther(page + "#rewards", { error: "Add at least one reward before launching." });
    const now = Date.now();
    getDb()
      .prepare("UPDATE projects SET status = 'live', launched_at = ?, deadline = ? WHERE id = ?")
      .run(now, now + p.duration_days * DAY, p.id);
    return seeOther(`/projects/${p.slug}`, { notice: "Your project is live. Good luck!" });
  },

  "project-delete"({ form, user }) {
    const p = projectFromForm(form);
    if (!p || p.creator_id !== user.id) return seeOther("/dashboard", { error: "You can only delete your own projects." });
    if (p.status === "live") return seeOther(`/projects/${p.slug}/edit`, { error: "A launched project can't be deleted." });
    getDb().prepare("DELETE FROM projects WHERE id = ?").run(p.id);
    return seeOther("/dashboard", { notice: "Draft deleted." });
  },

  profile({ form, user }) {
    const name = form.str("name", 60);
    if (name.length < 2) return seeOther("/dashboard?tab=settings", { error: "Please enter your name." });
    getDb().prepare("UPDATE users SET name = ?, bio = ?, location = ? WHERE id = ?").run(name, form.str("bio", 500), form.str("location", 80), user.id);
    return seeOther("/dashboard?tab=settings", { notice: "Profile updated." });
  },
};

export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  if (!sameOrigin(req)) return new NextResponse("Cross-site request blocked", { status: 403 });
  const pub = Object.hasOwn(publicActions, action) ? publicActions[action] : undefined;
  const authed = Object.hasOwn(userActions, action) ? userActions[action] : undefined;
  if (!pub && !authed) return new NextResponse("Not found", { status: 404 });
  const form = await readForm(req);
  const user = await currentUser();
  if (pub) return pub({ form, user });
  if (!user) {
    const referer = req.headers.get("referer");
    let next = "/";
    try {
      if (referer) {
        const u = new URL(referer);
        next = u.pathname + u.search;
      }
    } catch {}
    return seeOther(`/login?next=${encodeURIComponent(safeNext(next))}`, { error: "Sign in to continue." });
  }
  return authed!({ form, user });
}
