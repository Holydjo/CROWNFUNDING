import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { currentUser, endSession, startSession, type User } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { readForm, safeNext, sameOrigin, seeOther, type Form } from "@/lib/http";
import { isCategory } from "@/lib/categories";
import { getT, isLocale, LANG_COOKIE, type T } from "@/lib/i18n";
import { slugify } from "@/lib/seed";
import { getProjectById, getReward, pledgeOf, projectState, rewardsFor, uniqueSlug, type Project } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Ctx = { req: Request; form: Form; user: User | null; t: T };
type Authed = { req: Request; form: Form; user: User; t: T };

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

/** The same-site page a form was posted from, without any old flash message. */
function backPath(req: Request): string {
  const referer = req.headers.get("referer");
  if (!referer) return "/";
  try {
    const u = new URL(referer);
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (u.host !== host) return "/";
    u.searchParams.delete("error");
    u.searchParams.delete("notice");
    return safeNext(u.pathname + u.search);
  } catch {
    return "/";
  }
}

function readBasics(form: Form, t: T) {
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
  if (title.length < 3) error = t.msg.titleShort;
  else if (!isCategory(category)) error = t.msg.chooseCategory;
  else if (goal === null || goal < 1 || goal > MAX_AMOUNT) error = t.msg.goalRange;
  else if (duration === null || duration < 1 || duration > 60) error = t.msg.durationRange;
  else if (image_url && !/^https:\/\/[^\s"'<>]+$/i.test(image_url)) error = t.msg.imageHttps;
  return { error, title, blurb, category, location, image_url, story, risks, goal: goal ?? 0, duration: duration ?? 30 };
}

const publicActions: Record<string, (ctx: Ctx) => Promise<NextResponse> | NextResponse> = {
  async signup({ form, t }) {
    const name = form.str("name", 60);
    const email = form.str("email", 200).toLowerCase();
    const password = form.str("password", 200);
    const next = safeNext(form.str("next", 500));
    const back = `/signup?next=${encodeURIComponent(next)}`;
    if (name.length < 2) return seeOther(back, { error: t.msg.name });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return seeOther(back, { error: t.msg.email });
    if (password.length < 8) return seeOther(back, { error: t.msg.password });
    const db = getDb();
    if (db.prepare("SELECT 1 AS x FROM users WHERE email = ?").get(email)) return seeOther(back, { error: t.msg.emailTaken });
    const r = db
      .prepare("INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)")
      .run(name, email, hashPassword(password), Date.now());
    await startSession(Number(r.lastInsertRowid));
    return seeOther(next, { notice: t.msg.welcome(name) });
  },

  async login({ form, t }) {
    const email = form.str("email", 200).toLowerCase();
    const password = form.str("password", 200);
    const next = safeNext(form.str("next", 500));
    const row = getDb().prepare("SELECT id, password_hash FROM users WHERE email = ?").get(email) as
      | { id: number; password_hash: string }
      | undefined;
    if (!row || !verifyPassword(password, row.password_hash))
      return seeOther(`/login?next=${encodeURIComponent(next)}`, { error: t.msg.badLogin });
    await startSession(row.id);
    return seeOther(next);
  },

  async logout() {
    await endSession();
    return seeOther("/");
  },

  /** Remember the visitor's language and return to the page they were on. */
  async lang({ req, form }) {
    const lang = form.str("lang", 5);
    const back = backPath(req);
    if (!isLocale(lang)) return seeOther(back);
    (await cookies()).set(LANG_COOKIE, lang, { path: "/", sameSite: "lax", maxAge: 365 * 86_400 });
    return seeOther(back);
  },
};

const userActions: Record<string, (ctx: Authed) => Promise<NextResponse> | NextResponse> = {
  pledge({ form, user, t }) {
    const p = projectFromForm(form);
    if (!visible(p, user)) return seeOther("/discover", { error: t.msg.noProject });
    const page = `/projects/${p.slug}`;
    if (projectState(p) !== "live") return seeOther(page, { error: t.msg.notAccepting });
    if (p.creator_id === user.id) return seeOther(page, { error: t.msg.ownProject });
    const amount = form.int("amount");
    const rewardId = form.int("reward_id");
    const back = `${page}/pledge${rewardId ? `?reward=${rewardId}` : ""}`;
    if (amount === null || amount < 1 || amount > MAX_AMOUNT) return seeOther(back, { error: t.msg.minAmount });
    const existing = pledgeOf(p.id, user.id);
    if (rewardId !== null) {
      const reward = getReward(rewardId);
      if (!reward || reward.project_id !== p.id) return seeOther(back, { error: t.msg.noReward });
      if (amount < reward.amount) return seeOther(back, { error: t.msg.rewardMin(t.money(reward.amount)) });
      const claimedByOthers = reward.claimed - (existing?.reward_id === reward.id ? 1 : 0);
      if (reward.limit_qty !== null && claimedByOthers >= reward.limit_qty) return seeOther(back, { error: t.msg.rewardGone });
    }
    const db = getDb();
    if (existing) {
      db.prepare("UPDATE pledges SET amount = ?, reward_id = ? WHERE id = ?").run(amount, rewardId, existing.id);
      return seeOther(page, { notice: t.msg.pledgeNow(t.money(amount)) });
    }
    db.prepare("INSERT INTO pledges (project_id, user_id, reward_id, amount, created_at) VALUES (?, ?, ?, ?, ?)").run(
      p.id,
      user.id,
      rewardId,
      amount,
      Date.now()
    );
    return seeOther(page, { notice: t.msg.pledged(t.money(amount)) });
  },

  "pledge-cancel"({ form, user, t }) {
    const p = projectFromForm(form);
    if (!visible(p, user)) return seeOther("/discover", { error: t.msg.noProject });
    const page = `/projects/${p.slug}`;
    if (projectState(p) !== "live") return seeOther(page, { error: t.msg.pledgeLocked });
    getDb().prepare("DELETE FROM pledges WHERE project_id = ? AND user_id = ?").run(p.id, user.id);
    return seeOther(page, { notice: t.msg.cancelled });
  },

  save({ form, user, t }) {
    const p = projectFromForm(form);
    if (!visible(p, user)) return seeOther("/discover", { error: t.msg.noProject });
    const db = getDb();
    const had = db.prepare("DELETE FROM saves WHERE project_id = ? AND user_id = ?").run(p.id, user.id).changes;
    if (!had) db.prepare("INSERT INTO saves (user_id, project_id, created_at) VALUES (?, ?, ?)").run(user.id, p.id, Date.now());
    return seeOther(`/projects/${p.slug}`, { notice: had ? t.msg.unsaved : t.msg.saved });
  },

  comment({ form, user, t }) {
    const p = projectFromForm(form);
    if (!visible(p, user) || p.status !== "live") return seeOther("/discover", { error: t.msg.noProject });
    const page = `/projects/${p.slug}?tab=comments`;
    const body = form.str("body", 2000);
    if (!body) return seeOther(page, { error: t.msg.emptyComment });
    if (p.creator_id !== user.id && !pledgeOf(p.id, user.id)) return seeOther(page, { error: t.msg.backersOnly });
    getDb().prepare("INSERT INTO comments (project_id, user_id, body, created_at) VALUES (?, ?, ?, ?)").run(p.id, user.id, body, Date.now());
    return seeOther(page, { notice: t.msg.commentPosted });
  },

  update({ form, user, t }) {
    const p = projectFromForm(form);
    if (!p || p.creator_id !== user.id || p.status !== "live") return seeOther("/dashboard", { error: t.msg.updateOwner });
    const page = `/projects/${p.slug}?tab=updates`;
    const title = form.str("title", 120);
    const body = form.str("body", 10000);
    if (!title || !body) return seeOther(page, { error: t.msg.updateFields });
    getDb().prepare("INSERT INTO updates (project_id, title, body, created_at) VALUES (?, ?, ?, ?)").run(p.id, title, body, Date.now());
    return seeOther(page, { notice: t.msg.updatePublished });
  },

  faq({ form, user, t }) {
    const p = projectFromForm(form);
    if (!p || p.creator_id !== user.id) return seeOther("/dashboard", { error: t.msg.faqOwner });
    const page = `/projects/${p.slug}?tab=faq`;
    const question = form.str("question", 200);
    const answer = form.str("answer", 2000);
    if (!question || !answer) return seeOther(page, { error: t.msg.faqFields });
    getDb().prepare("INSERT INTO faqs (project_id, question, answer) VALUES (?, ?, ?)").run(p.id, question, answer);
    return seeOther(page, { notice: t.msg.faqAdded });
  },

  "project-create"({ form, user, t }) {
    const b = readBasics(form, t);
    if (b.error) return seeOther("/start", { error: b.error });
    const slug = uniqueSlug(slugify(b.title));
    getDb()
      .prepare(
        `INSERT INTO projects (slug, creator_id, title, blurb, category, location, image_url, story, risks, goal, duration_days, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`
      )
      .run(slug, user.id, b.title, b.blurb, b.category, b.location, b.image_url, b.story, b.risks, b.goal, b.duration, Date.now());
    return seeOther(`/projects/${slug}/edit`, { notice: t.msg.draftSaved });
  },

  "project-edit"({ form, user, t }) {
    const p = projectFromForm(form);
    if (!p || p.creator_id !== user.id) return seeOther("/dashboard", { error: t.msg.ownEdit });
    const page = `/projects/${p.slug}/edit`;
    const b = readBasics(form, t);
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
    return seeOther(page, { notice: t.msg.changesSaved });
  },

  "reward-add"({ form, user, t }) {
    const p = projectFromForm(form);
    if (!p || p.creator_id !== user.id) return seeOther("/dashboard", { error: t.msg.ownEdit });
    const page = `/projects/${p.slug}/edit#rewards`;
    const title = form.str("title", 100);
    const amount = form.int("amount");
    const limitRaw = form.str("limit_qty", 10);
    const limit = limitRaw === "" ? null : form.int("limit_qty");
    if (!title) return seeOther(page, { error: t.msg.rewardTitle });
    if (amount === null || amount < 1 || amount > MAX_AMOUNT) return seeOther(page, { error: t.msg.rewardAmount });
    if (limitRaw !== "" && (limit === null || limit < 1)) return seeOther(page, { error: t.msg.rewardLimit });
    getDb()
      .prepare("INSERT INTO rewards (project_id, title, description, amount, delivery, limit_qty) VALUES (?, ?, ?, ?, ?, ?)")
      .run(p.id, title, form.str("description", 1000), amount, form.str("delivery", 40), limit);
    return seeOther(page, { notice: t.msg.rewardAdded });
  },

  "reward-delete"({ form, user, t }) {
    const p = projectFromForm(form);
    if (!p || p.creator_id !== user.id) return seeOther("/dashboard", { error: t.msg.ownEdit });
    const page = `/projects/${p.slug}/edit#rewards`;
    const reward = getReward(form.int("reward_id") ?? -1);
    if (!reward || reward.project_id !== p.id) return seeOther(page, { error: t.msg.noReward });
    if (reward.claimed > 0) return seeOther(page, { error: t.msg.rewardClaimed });
    getDb().prepare("DELETE FROM rewards WHERE id = ?").run(reward.id);
    return seeOther(page, { notice: t.msg.rewardRemoved });
  },

  "project-launch"({ form, user, t }) {
    const p = projectFromForm(form);
    if (!p || p.creator_id !== user.id) return seeOther("/dashboard", { error: t.msg.ownLaunch });
    const page = `/projects/${p.slug}/edit`;
    if (p.status === "live") return seeOther(`/projects/${p.slug}`);
    if (!p.blurb) return seeOther(page, { error: t.msg.needBlurb });
    if (p.story.length < 20) return seeOther(page, { error: t.msg.needStory });
    if (rewardsFor(p.id).length === 0) return seeOther(page + "#rewards", { error: t.msg.needReward });
    const now = Date.now();
    getDb()
      .prepare("UPDATE projects SET status = 'live', launched_at = ?, deadline = ? WHERE id = ?")
      .run(now, now + p.duration_days * DAY, p.id);
    return seeOther(`/projects/${p.slug}`, { notice: t.msg.launched });
  },

  "project-delete"({ form, user, t }) {
    const p = projectFromForm(form);
    if (!p || p.creator_id !== user.id) return seeOther("/dashboard", { error: t.msg.ownDelete });
    if (p.status === "live") return seeOther(`/projects/${p.slug}/edit`, { error: t.msg.liveDelete });
    getDb().prepare("DELETE FROM projects WHERE id = ?").run(p.id);
    return seeOther("/dashboard", { notice: t.msg.draftDeleted });
  },

  profile({ form, user, t }) {
    const name = form.str("name", 60);
    if (name.length < 2) return seeOther("/dashboard?tab=settings", { error: t.msg.name });
    getDb().prepare("UPDATE users SET name = ?, bio = ?, location = ? WHERE id = ?").run(name, form.str("bio", 500), form.str("location", 80), user.id);
    return seeOther("/dashboard?tab=settings", { notice: t.msg.profileUpdated });
  },
};

export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  if (!sameOrigin(req)) return new NextResponse("Cross-site request blocked", { status: 403 });
  const pub = Object.hasOwn(publicActions, action) ? publicActions[action] : undefined;
  const authed = Object.hasOwn(userActions, action) ? userActions[action] : undefined;
  if (!pub && !authed) return new NextResponse("Not found", { status: 404 });
  const [form, user, t] = await Promise.all([readForm(req), currentUser(), getT()]);
  if (pub) return pub({ req, form, user, t });
  if (!user) return seeOther(`/login?next=${encodeURIComponent(backPath(req))}`, { error: t.msg.signIn });
  return authed!({ req, form, user, t });
}
