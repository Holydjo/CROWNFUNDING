#!/usr/bin/env node
// Remake report: boots the production build against a fresh, seeded database and
// exercises every feature over HTTP, exactly as a browser would (forms + cookies).
// Prints "REMAKE COMPLETE" only when every check passes; exits non-zero otherwise.
//
//   npm run report            build, then run all checks
//   BASE_URL=http://host:port node scripts/report.mjs   run against a running server

import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEMO = { email: "demo@crownfunding.test", password: "crown-demo-2026" };
const LIVE = "pocket-loom-weave-anywhere";
const FUNDED = "marginalia-a-fountain-pen-for-left-handers";
const FAILED = "brass-bellows-street-band-world-tour-film";

let BASE = process.env.BASE_URL || "";
let server;
let tmp;

function freePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.once("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

async function boot() {
  if (BASE) return;
  const port = await freePort();
  tmp = mkdtempSync(path.join(tmpdir(), "crownfunding-report-"));
  BASE = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "start", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: root,
    env: { ...process.env, CROWNFUNDING_DB: path.join(tmp, "report.db"), NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  server.stdout.on("data", (d) => (log += d));
  server.stderr.on("data", (d) => (log += d));
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error("Server exited early:\n" + log);
    try {
      const r = await fetch(BASE + "/about");
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("Server did not start in time:\n" + log);
}

function shutdown() {
  if (server && server.exitCode === null) server.kill("SIGTERM");
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}

// ---------- tiny browser ----------
class Actor {
  constructor(name) {
    this.name = name;
    this.jar = new Map();
    /** Headers sent on every request, e.g. accept-language. */
    this.always = {};
  }
  #headers(extra = {}) {
    const cookie = [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ");
    return { ...this.always, ...(cookie ? { cookie } : {}), ...extra };
  }
  #store(res) {
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      const k = pair.slice(0, i);
      const v = pair.slice(i + 1);
      if (v === "" || /max-age=0|expires=thu, 01 jan 1970/i.test(c)) this.jar.delete(k);
      else this.jar.set(k, v);
    }
  }
  /** GET, following redirects. Returns { status, html, url, redirects }. */
  async get(p) {
    let url = p;
    const redirects = [];
    for (let i = 0; i < 6; i++) {
      const res = await fetch(BASE + url, { headers: this.#headers(), redirect: "manual" });
      this.#store(res);
      const loc = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && loc) {
        url = loc.startsWith("http") ? new URL(loc).pathname + new URL(loc).search : loc;
        redirects.push(url);
        continue;
      }
      const html = (await res.text()).replaceAll("<!-- -->", "");
      return { status: res.status, html, url, redirects };
    }
    throw new Error("Too many redirects for " + p);
  }
  /** POST a form to /api/<action>. Returns { status, location }. */
  async post(action, fields = {}, headers = {}) {
    const res = await fetch(`${BASE}/api/${action}`, {
      method: "POST",
      headers: this.#headers({ "content-type": "application/x-www-form-urlencoded", origin: BASE, ...headers }),
      body: new URLSearchParams(Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, String(v)]))).toString(),
      redirect: "manual",
    });
    this.#store(res);
    return { status: res.status, location: decodeURIComponent(res.headers.get("location") || "") };
  }
  async signup(name) {
    const email = `${name.toLowerCase().replace(/\W+/g, ".")}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@report.test`;
    this.email = email;
    this.password = "report-pass-" + Math.random().toString(36).slice(2);
    return this.post("signup", { name, email, password: this.password, next: "/" });
  }
}

const dollars = (s) => Number(s.replace(/[$,]/g, ""));
const testid = (html, id) => {
  const m = html.match(new RegExp(`data-testid="${id}"[^>]*>([^<]*)<`));
  return m ? m[1].trim() : null;
};
const count = (html, needle) => html.split(needle).length - 1;
async function funding(actor, slug) {
  const { html } = await actor.get(`/projects/${slug}`);
  return {
    html,
    id: Number(html.match(/name="project_id" value="(\d+)"/)?.[1]),
    pledged: dollars(testid(html, "pledged") ?? "NaN"),
    backers: dollars(testid(html, "backers") ?? "NaN"),
    rewards: [...new Set([...html.matchAll(/pledge\?reward=(\d+)/g)].map((m) => Number(m[1])))],
  };
}

// ---------- checks ----------
const results = [];
let area = "";
function section(name) {
  area = name;
}
async function check(name, fn) {
  try {
    const r = await fn();
    if (r === false) throw new Error("expectation not met");
    results.push({ area, name, ok: true });
  } catch (e) {
    results.push({ area, name, ok: false, detail: String(e?.message ?? e).split("\n")[0].slice(0, 200) });
  }
}

async function run() {
  const anon = new Actor("anon");
  const alice = new Actor("alice");
  const bob = new Actor("bob");
  const cara = new Actor("cara");

  section("Home page");
  const home = await anon.get("/");
  await check("renders with hero and calls to action", () => home.status === 200 && home.html.includes("Fund the things worth making") && home.html.includes('href="/start"'));
  await check("featured project spotlight", () => home.html.includes('data-testid="featured"') && home.html.includes("Lanternfall"));
  await check("curated rows: recommended, almost funded, home stretch, fresh", () =>
    ["Recommended for you", "Almost funded", "Home stretch", "Fresh launches"].every((t) => home.html.includes(t)) && count(home.html, 'data-testid="project-card"') >= 12);
  await check("category navigation (12 categories)", () => count(home.html.split('data-testid="category-grid"')[1] ?? "", "/discover?category=") >= 12);
  await check("site-wide funding stats", () => /data-testid="site-stats"/.test(home.html) && /\$[\d,]{6,}/.test(home.html));
  await check("project cards show progress, time left and % funded", () => /\d+ (days|hours|minutes) left • (<span[^>]*>)?\d+% funded/.test(home.html) && home.html.includes('role="progressbar"'));

  section("Discover & search");
  const disc = await anon.get("/discover");
  await check("lists live projects, 12 per page", () => disc.status === 200 && count(disc.html, 'data-testid="project-card"') === 12 && testid(disc.html, "result-count")?.startsWith("20"));
  await check("pagination", async () => {
    const p2 = await anon.get("/discover?page=2");
    return testid(p2.html, "page-indicator") === "Page 2 of 2" && count(p2.html, 'data-testid="project-card"') === 8;
  });
  await check("category filter", async () => {
    const r = await anon.get("/discover?category=games");
    return count(r.html, 'data-testid="project-card"') === 3 && r.html.includes("Dice of the Deep") && !r.html.includes("Pocket Loom");
  });
  await check("keyword search (title, creator, location)", async () => {
    const a = await anon.get("/discover?q=sourdough");
    const b = await anon.get("/discover?q=Klangwerk");
    const c = await anon.get("/discover?q=Kyoto");
    return a.html.includes("Ember &amp; Rye") && count(a.html, 'data-testid="project-card"') === 1 && b.html.includes("Tinker Board") && c.html.includes("Paper Constellations");
  });
  await check("empty state for no results", async () => (await anon.get("/discover?q=zzzzqqqq")).html.includes('data-testid="no-results"'));
  await check("sort by most funded is descending", async () => {
    const r = await anon.get("/discover?sort=most_funded");
    const first = r.html.match(/href="\/projects\/([a-z0-9-]+)"/)?.[1];
    const top = await funding(anon, first);
    const others = await Promise.all([LIVE, "paper-constellations-hand-cut-star-maps"].map((s) => funding(anon, s)));
    return others.every((o) => top.pledged >= o.pledged);
  });
  await check("sort by end date puts soonest deadline first", async () => {
    const r = await anon.get("/discover?sort=end_date");
    return /href="\/projects\/slow-cycle-a-bikepacking-cookbook"/.test(r.html.split('data-testid="project-card"')[1]);
  });
  await check("sort by newest and popularity respond", async () => (await anon.get("/discover?sort=newest")).status === 200 && (await anon.get("/discover?sort=popularity")).status === 200);
  await check("filter: successfully funded campaigns", async () => {
    const r = await anon.get("/discover?state=successful");
    return count(r.html, 'data-testid="project-card"') === 3 && r.html.includes("Marginalia") && !r.html.includes("Brass &amp; Bellows");
  });
  await check("filter: all campaigns includes ended ones", async () => testid((await anon.get("/discover?state=all")).html, "result-count")?.startsWith("24"));

  section("Project page");
  const live = await funding(anon, LIVE);
  await check("title, blurb, creator, category and location", () => testid(live.html, "project-title") === "Pocket Loom — Weave Anywhere" && live.html.includes("Atelier Fio") && live.html.includes("Porto, Portugal"));
  await check("funding box: pledged, goal, % funded, backers, time left", () => live.pledged === 12150 && live.backers > 50 && testid(live.html, "percent") === "(135%)" && live.html.includes("$9,000") && /days to go/.test(live.html));
  await check("all-or-nothing notice", () => live.html.includes("All or nothing."));
  await check("story and risks sections", () => live.html.includes("Where the money goes") && live.html.includes("Risks and challenges"));
  await check("reward tiers with price, delivery, backer counts and limits", () => count(live.html, 'data-testid="reward"') === 4 && live.html.includes("Pledge $38 or more") && live.html.includes("Estimated delivery") && /Limited — \d+ of 25 left/.test(live.html));
  for (const [tab, marker] of [["rewards", 'data-testid="reward"'], ["faq", 'data-testid="faq"'], ["updates", 'data-testid="update"'], ["comments", 'data-testid="comment"'], ["community", "Most recent backers"]]) {
    await check(`${tab} tab`, async () => {
      const r = await anon.get(`/projects/${LIVE}?tab=${tab}`);
      return r.status === 200 && r.html.includes(`data-testid="tab-${tab}"`) && r.html.includes(marker);
    });
  }
  await check("successful campaign shows funded state and takes no pledges", async () => {
    const r = await anon.get(`/projects/${FUNDED}`);
    return r.html.includes("Successfully funded") && r.html.includes("was successfully funded on") && !r.html.includes('data-testid="back-button"');
  });
  await check("unsuccessful campaign shows it fell short and nobody was charged", async () => {
    const r = await anon.get(`/projects/${FAILED}`);
    return r.html.includes("Funding unsuccessful") && r.html.includes("No backers were charged") && !r.html.includes('data-testid="back-button"');
  });
  await check("unknown project and unknown page return 404", async () => (await anon.get("/projects/no-such-project")).status === 404 && (await anon.get("/nope")).status === 404);
  await check("creator profile page", async () => {
    const href = live.html.match(/href="(\/profile\/\d+)"/)?.[1];
    const r = await anon.get(href);
    return r.status === 200 && testid(r.html, "profile-name") === "Atelier Fio" && r.html.includes("Pocket Loom");
  });

  section("Accounts");
  await check("sign up creates an account and signs in", async () => {
    const r = await alice.signup("Alice Report");
    const h = await alice.get("/");
    return r.status === 303 && alice.jar.has("cf_session") && h.html.includes('data-testid="nav-user"') && h.html.includes("Alice Report");
  });
  await check("sign up validation: duplicate email, short password, bad email", async () => {
    const x = new Actor("x");
    const dup = await x.post("signup", { name: "Dup", email: alice.email, password: "long-enough-pass", next: "/" });
    const short = await x.post("signup", { name: "Short", email: `s${Date.now()}@report.test`, password: "short", next: "/" });
    const bad = await x.post("signup", { name: "Bad", email: "not-an-email", password: "long-enough-pass", next: "/" });
    return dup.location.includes("already exists") && short.location.includes("8 characters") && bad.location.includes("valid email") && !x.jar.has("cf_session");
  });
  await check("log out ends the session", async () => {
    await alice.post("logout");
    const h = await alice.get("/");
    return !h.html.includes('data-testid="nav-user"') && h.html.includes('href="/login"');
  });
  await check("log in rejects a wrong password", async () => {
    const r = await alice.post("login", { email: alice.email, password: "wrong-password", next: "/" });
    return r.location.includes("/login") && r.location.includes("don't match") && !alice.jar.has("cf_session");
  });
  await check("log in with correct password, returning to the requested page", async () => {
    const r = await alice.post("login", { email: alice.email, password: alice.password, next: "/dashboard" });
    return r.location === "/dashboard" && (await alice.get("/dashboard")).html.includes("Hello, Alice Report");
  });
  await check("seeded demo account can sign in", async () => {
    const d = new Actor("demo");
    await d.post("login", { ...DEMO, next: "/" });
    return (await d.get("/dashboard")).html.includes("Hello, Demo Backer");
  });
  await check("members-only pages send visitors to log in", async () => {
    const a = await anon.get("/dashboard");
    const b = await anon.get(`/projects/${LIVE}/pledge`);
    const c = await anon.post("pledge", { project_id: live.id, amount: 10 });
    const s = await anon.get("/start");
    return a.url.startsWith("/login") && b.url.startsWith("/login") && c.location.startsWith("/login") && s.html.includes('data-testid="start-gate"');
  });
  await check("profile settings update the public profile", async () => {
    await alice.post("profile", { name: "Alice Report", bio: "Backer of odd and lovely things.", location: "Reportville" });
    const href = (await alice.get("/dashboard")).html.match(/href="(\/profile\/\d+)"/)?.[1];
    const r = await anon.get(href);
    return r.html.includes("Backer of odd and lovely things.") && r.html.includes("Reportville");
  });

  section("Backing a project");
  const [cheap, loom] = [live.rewards[0], live.rewards[1]];
  await check("pledge page lists no-reward option and every tier", async () => {
    const r = await alice.get(`/projects/${LIVE}/pledge`);
    return r.status === 200 && count(r.html, 'data-testid="pledge-option"') === 5 && r.html.includes("Pledge without a reward");
  });
  await check("pledging for a reward raises pledged total and backer count", async () => {
    const r = await alice.post("pledge", { project_id: live.id, reward_id: loom, amount: 40 });
    const after = await funding(alice, LIVE);
    return r.location.includes("You pledged $40") && after.pledged === live.pledged + 40 && after.backers === live.backers + 1 && testid(after.html, "my-pledge")?.includes("$40");
  });
  await check("a pledge below the reward's price is rejected", async () => {
    await bob.signup("Bob Report");
    const r = await bob.post("pledge", { project_id: live.id, reward_id: loom, amount: 5 });
    const after = await funding(anon, LIVE);
    return r.location.includes("at least $38") && after.backers === live.backers + 1;
  });
  await check("invalid amounts are rejected (zero, negative, text)", async () => {
    const rs = await Promise.all(["0", "-5", "abc", ""].map((amount) => bob.post("pledge", { project_id: live.id, amount })));
    return rs.every((r) => r.location.includes("at least $1")) && (await funding(anon, LIVE)).backers === live.backers + 1;
  });
  await check("pledge without a reward", async () => {
    const r = await bob.post("pledge", { project_id: live.id, amount: 7 });
    const after = await funding(anon, LIVE);
    return r.location.includes("You pledged $7") && after.pledged === live.pledged + 47 && after.backers === live.backers + 2;
  });
  await check("changing a pledge updates the total without double counting", async () => {
    const r = await alice.post("pledge", { project_id: live.id, reward_id: cheap, amount: 100 });
    const after = await funding(anon, LIVE);
    return r.location.includes("now $100") && after.pledged === live.pledged + 107 && after.backers === live.backers + 2;
  });
  await check("backed project appears in the backer's dashboard with the amount", async () => {
    const r = await alice.get("/dashboard");
    return r.html.includes("Pocket Loom") && r.html.includes("You pledged $100") && testid(r.html, "total-pledged") === "$100";
  });
  await check("cancelling a pledge restores the totals", async () => {
    const r = await bob.post("pledge-cancel", { project_id: live.id });
    const after = await funding(anon, LIVE);
    return r.location.includes("cancelled") && after.pledged === live.pledged + 100 && after.backers === live.backers + 1;
  });
  await check("ended campaigns reject new pledges", async () => {
    const ended = await funding(anon, FUNDED);
    const r = await alice.post("pledge", { project_id: ended.id, amount: 50 });
    return r.location.includes("not accepting pledges") && (await funding(anon, FUNDED)).pledged === ended.pledged;
  });
  await check("a reward from another project can't be claimed", async () => {
    const other = await funding(anon, "mend-a-visible-mending-kit");
    const r = await bob.post("pledge", { project_id: live.id, reward_id: other.rewards[0], amount: 500 });
    return r.location.includes("doesn't exist");
  });

  section("Saving projects");
  await check("save for later, see it in the dashboard, then unsave", async () => {
    const s = await alice.post("save", { project_id: live.id });
    const page = await alice.get(`/projects/${LIVE}`);
    const dash = await alice.get("/dashboard?tab=saved");
    const u = await alice.post("save", { project_id: live.id });
    const dash2 = await alice.get("/dashboard?tab=saved");
    return s.location.includes("Saved") && page.html.includes("★ Saved") && dash.html.includes("Pocket Loom") && u.location.includes("Removed") && !dash2.html.includes("Pocket Loom");
  });

  section("Comments");
  await check("only backers can comment", async () => {
    const r = await bob.post("comment", { project_id: live.id, body: "I have not backed this." });
    const page = await bob.get(`/projects/${LIVE}?tab=comments`);
    return r.location.includes("Only backers") && page.html.includes('data-testid="comment-gate"') && !page.html.includes("I have not backed this.");
  });
  await check("a backer's comment is published, with HTML escaped", async () => {
    const r = await alice.post("comment", { project_id: live.id, body: 'Lovely loom <script>alert("x")</script>' });
    const page = await anon.get(`/projects/${LIVE}?tab=comments`);
    return r.location.includes("Comment posted") && page.html.includes("Lovely loom &lt;script&gt;") && !page.html.includes('<script>alert("x")');
  });

  section("Creator tools");
  const title = `Report Kettle ${Date.now()}`;
  const basics = { title, blurb: "A kettle that whistles in tune.", category: "design", location: "Reportville", goal: 500, duration_days: 10, story: "We are making a kettle that whistles a perfect A440.\n\n## Why\n\nBecause mornings deserve it.", risks: "Tuning steam is hard." };
  let slug = "";
  let mine;
  await check("project form validation (title, category, goal, duration)", async () => {
    await cara.signup("Cara Creator");
    const rs = await Promise.all([
      cara.post("project-create", { ...basics, title: "x" }),
      cara.post("project-create", { ...basics, category: "nonsense" }),
      cara.post("project-create", { ...basics, goal: 0 }),
      cara.post("project-create", { ...basics, duration_days: 90 }),
      cara.post("project-create", { ...basics, image_url: "javascript:alert(1)" }),
    ]);
    return rs.every((r) => r.location.startsWith("/start?error="));
  });
  await check("create a draft project", async () => {
    const r = await cara.post("project-create", basics);
    slug = r.location.match(/^\/projects\/([a-z0-9-]+)\/edit/)?.[1] ?? "";
    const edit = await cara.get(`/projects/${slug}/edit`);
    return slug.startsWith("report-kettle") && edit.status === 200 && edit.html.includes("Draft") && edit.html.includes('data-testid="launch-button"');
  });
  await check("drafts are private: hidden from visitors, search and other users", async () => {
    const a = await anon.get(`/projects/${slug}`);
    const b = await alice.get(`/projects/${slug}/edit`);
    const s = await anon.get(`/discover?state=all&q=${encodeURIComponent(title)}`);
    const own = await cara.get(`/projects/${slug}`);
    return a.status === 404 && b.status === 404 && s.html.includes('data-testid="no-results"') && own.status === 200 && own.html.includes("private preview");
  });
  await check("a draft can't launch without a reward", async () => {
    mine = await funding(cara, slug);
    // Drafts have no public forms; the creator's edit page carries the id.
    mine.id = Number((await cara.get(`/projects/${slug}/edit`)).html.match(/name="project_id" value="(\d+)"/)?.[1]);
    const r = await cara.post("project-launch", { project_id: mine.id });
    return r.location.includes("at least one reward") && (await anon.get(`/projects/${slug}`)).status === 404;
  });
  await check("only the creator can edit, add rewards or launch", async () => {
    const rs = await Promise.all([
      alice.post("project-edit", { ...basics, project_id: mine.id, title: "Hijacked" }),
      alice.post("reward-add", { project_id: mine.id, title: "Free stuff", amount: 1 }),
      alice.post("project-launch", { project_id: mine.id }),
      alice.post("project-delete", { project_id: mine.id }),
    ]);
    return rs.every((r) => r.location.startsWith("/dashboard?error=")) && (await cara.get(`/projects/${slug}/edit`)).html.includes(title);
  });
  await check("edit a draft's basics", async () => {
    const r = await cara.post("project-edit", { ...basics, project_id: mine.id, goal: 300 });
    return r.location.includes("Changes saved") && (await cara.get(`/projects/${slug}`)).html.includes("$300");
  });
  await check("add rewards, including a limited one; remove an unclaimed one", async () => {
    await cara.post("reward-add", { project_id: mine.id, title: "Tuned kettle", amount: 60, delivery: "May 2027", description: "One kettle." });
    await cara.post("reward-add", { project_id: mine.id, title: "Prototype No. 1", amount: 200, limit_qty: 1 });
    await cara.post("reward-add", { project_id: mine.id, title: "Mistake tier", amount: 3 });
    const edit = await cara.get(`/projects/${slug}/edit`);
    const wrong = [...edit.html.matchAll(/name="reward_id" value="(\d+)"/g)].map((m) => Number(m[1]))[0];
    const del = await cara.post("reward-delete", { project_id: mine.id, reward_id: wrong });
    const after = await cara.get(`/projects/${slug}/edit`);
    return count(edit.html, 'data-testid="edit-reward"') === 3 && del.location.includes("Reward removed") && count(after.html, 'data-testid="edit-reward"') === 2 && !after.html.includes("Mistake tier");
  });
  await check("launch makes the project public with a running deadline", async () => {
    const r = await cara.post("project-launch", { project_id: mine.id });
    const page = await anon.get(`/projects/${slug}`);
    return r.location.includes("is live") && page.status === 200 && /(9|10)\s*<\/p>\s*<p[^>]*>days to go/.test(page.html) && page.html.includes("All or nothing.");
  });
  await check("launched project is discoverable (newest first, and by search)", async () => {
    const newest = await anon.get("/discover?sort=newest");
    const search = await anon.get(`/discover?q=${encodeURIComponent(title)}`);
    return newest.html.split('data-testid="project-card"')[1].includes(slug) && search.html.includes(slug);
  });
  await check("goal, title and duration are locked after launch", async () => {
    await cara.post("project-edit", { ...basics, project_id: mine.id, title: "Renamed", goal: 1, blurb: "Now with a better blurb." });
    const page = await anon.get(`/projects/${slug}`);
    return testid(page.html, "project-title") === title && page.html.includes("$300") && page.html.includes("Now with a better blurb.");
  });
  await check("creators can't back their own project", async () => {
    const r = await cara.post("pledge", { project_id: mine.id, amount: 300 });
    return r.location.includes("can't back your own") && (await funding(anon, slug)).pledged === 0;
  });
  let kettle;
  await check("limited rewards sell out", async () => {
    kettle = await funding(anon, slug);
    const limited = kettle.rewards[1];
    const a = await alice.post("pledge", { project_id: kettle.id, reward_id: limited, amount: 200 });
    const b = await bob.post("pledge", { project_id: kettle.id, reward_id: limited, amount: 200 });
    const page = await anon.get(`/projects/${slug}`);
    return a.location.includes("You pledged $200") && b.location.includes("no longer available") && page.html.includes("All gone");
  });
  await check("the holder of a sold-out reward can still adjust their pledge", async () => {
    const r = await alice.post("pledge", { project_id: kettle.id, reward_id: kettle.rewards[1], amount: 250 });
    return r.location.includes("now $250");
  });
  await check("reaching the goal shows as funded progress", async () => {
    await bob.post("pledge", { project_id: kettle.id, reward_id: kettle.rewards[0], amount: 60 });
    const f = await funding(anon, slug);
    return f.pledged === 310 && f.backers === 2 && testid(f.html, "percent") === "(103%)";
  });
  await check("a reward with backers can't be removed", async () => {
    const r = await cara.post("reward-delete", { project_id: kettle.id, reward_id: kettle.rewards[0] });
    return r.location.includes("can't be removed");
  });
  await check("a launched project can't be deleted", async () => {
    const r = await cara.post("project-delete", { project_id: kettle.id });
    return r.location.includes("can't be deleted") && (await anon.get(`/projects/${slug}`)).status === 200;
  });
  await check("creator posts an update; others cannot", async () => {
    const no = await alice.post("update", { project_id: kettle.id, title: "Fake", body: "Not the creator." });
    const yes = await cara.post("update", { project_id: kettle.id, title: "First whistle", body: "It holds a note!" });
    const page = await anon.get(`/projects/${slug}?tab=updates`);
    return no.location.startsWith("/dashboard?error=") && yes.location.includes("Update published") && page.html.includes("First whistle") && !page.html.includes("Not the creator.");
  });
  await check("creator adds an FAQ entry; others cannot", async () => {
    const no = await alice.post("faq", { project_id: kettle.id, question: "Fake?", answer: "Fake." });
    const yes = await cara.post("faq", { project_id: kettle.id, question: "Does it work on induction?", answer: "Yes." });
    const page = await anon.get(`/projects/${slug}?tab=faq`);
    return no.location.startsWith("/dashboard?error=") && yes.location.includes("FAQ added") && page.html.includes("Does it work on induction?") && !page.html.includes("Fake?");
  });
  await check("creator can comment on their own project and is labelled", async () => {
    await cara.post("comment", { project_id: kettle.id, body: "Thank you all!" });
    const page = await anon.get(`/projects/${slug}?tab=comments`);
    return page.html.includes("Thank you all!") && />Creator</.test(page.html);
  });
  await check("creator dashboard lists created projects; draft can be deleted", async () => {
    const d = await cara.post("project-create", { ...basics, title: `Throwaway ${Date.now()}` });
    const dslug = d.location.match(/^\/projects\/([a-z0-9-]+)\/edit/)[1];
    const draft = { id: Number((await cara.get(`/projects/${dslug}/edit`)).html.match(/name="project_id" value="(\d+)"/)?.[1]) };
    const dash = await cara.get("/dashboard?tab=created");
    const del = await cara.post("project-delete", { project_id: draft.id });
    const dash2 = await cara.get("/dashboard?tab=created");
    return dash.html.includes(title) && dash.html.includes("Draft — not launched") && del.location.includes("Draft deleted") && !dash2.html.includes("Throwaway");
  });

  section("French");
  const MONTHS_FR = /\d{1,2} (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre) \d{4}/;
  const ENGLISH_UI = ["Back this project", "Discover more", "days to go", "Recommended for you", ">Log in<", "All or nothing", "Pledge without a reward"];
  const leaks = (html) => ENGLISH_UI.filter((s) => html.includes(s));
  await check("a French-speaking browser gets French by default", async () => {
    const fr = new Actor("fr-browser");
    fr.always["accept-language"] = "fr-FR,fr;q=0.9,en;q=0.5";
    const h = await fr.get("/");
    return h.html.includes('<html lang="fr"') && h.html.includes("Financez ce qui mérite") && h.html.includes("Recommandés pour vous") && leaks(h.html).length === 0;
  });
  await check("other browsers get English", async () => {
    const de = new Actor("de-browser");
    de.always["accept-language"] = "de-DE,de;q=0.9";
    return (await de.get("/")).html.includes('<html lang="en"') && (await anon.get("/")).html.includes('<html lang="en"');
  });
  const pierre = new Actor("pierre");
  await check("the language switch saves French and returns to the same page", async () => {
    const r = await pierre.post("lang", { lang: "fr" }, { referer: `${BASE}/discover?category=games&notice=old` });
    const d = await pierre.get(r.location);
    return r.location === "/discover?category=games" && pierre.jar.get("cf_lang") === "fr" && d.html.includes('<html lang="fr"') && d.html.includes(">Jeux") && testid(d.html, "result-count") === "3 projets";
  });
  await check("French project page: labels, money, dates, time left", async () => {
    const r = await pierre.get(`/projects/${LIVE}`);
    return r.html.includes("Soutenir ce projet") && r.html.includes("Tout ou rien.") && r.html.includes("Contreparties") &&
      /^\d{1,3}(\s\d{3})+\u00a0\$$/.test(testid(r.html, "pledged") ?? "") && /^\(\d+ %\)$/.test(testid(r.html, "percent") ?? "") &&
      r.html.includes("jours restants") && MONTHS_FR.test(r.html) && leaks(r.html).length === 0;
  });
  await check("French on every main page", async () => {
    const pages = { "/discover": "Découvrir", "/about": "Comment fonctionne Crownfunding", "/login": "Se connecter", "/signup": "S&#x27;inscrire", "/start": "Donnez vie à votre projet", "/no-such-page": "Nous n&#x27;avons pas trouvé cette page" };
    for (const [path, text] of Object.entries(pages)) {
      const r = await pierre.get(path);
      if (!r.html.includes(text) || leaks(r.html).length) throw new Error(`${path} is not in French`);
    }
    return true;
  });
  await check("messages after actions are in French", async () => {
    const s = await pierre.signup("Pierre Rapport");
    const mend = await funding(pierre, "mend-a-visible-mending-kit");
    const bad = await pierre.post("pledge", { project_id: mend.id, reward_id: mend.rewards[1], amount: 5 });
    const ok = await pierre.post("pledge", { project_id: mend.id, reward_id: mend.rewards[1], amount: 42 });
    const dash = await pierre.get("/dashboard");
    return s.location.includes("Bienvenue sur Crownfunding, Pierre Rapport") && bad.location.includes("au moins 42") &&
      ok.location.includes("Merci ! Vous avez promis 42") && dash.html.includes("Bonjour, Pierre Rapport") && dash.html.includes("Vous avez promis");
  });
  await check("switching back to English", async () => {
    const r = await pierre.post("lang", { lang: "en" }, { referer: `${BASE}/projects/${LIVE}` });
    const page = await pierre.get(r.location);
    return r.location === `/projects/${LIVE}` && page.html.includes('<html lang="en"') && page.html.includes("Manage your pledge") === false && page.html.includes("Back this project");
  });
  await check("the switch ignores unknown languages and off-site return addresses", async () => {
    const x = new Actor("x");
    const a = await x.post("lang", { lang: "de" }, { referer: `${BASE}/about` });
    const b = await x.post("lang", { lang: "fr" }, { referer: "https://evil.example/phish" });
    return a.location === "/about" && !a.location.includes("de") && b.location === "/" && x.jar.get("cf_lang") === "fr";
  });

  section("Safety");
  await check("cross-site form posts are blocked", async () => {
    const r = await alice.post("pledge", { project_id: live.id, amount: 999 }, { origin: "https://evil.example" });
    return r.status === 403 && (await funding(anon, LIVE)).pledged === live.pledged + 100;
  });
  await check("login never redirects off-site", async () => {
    const x = new Actor("x");
    const a = await x.post("login", { ...DEMO, next: "//evil.example/phish" });
    const b = await x.post("login", { ...DEMO, next: "https://evil.example" });
    return a.location === "/" && b.location === "/";
  });
  await check("session cookie is HttpOnly and SameSite=Lax", async () => {
    const res = await fetch(`${BASE}/api/login`, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ ...DEMO, next: "/" }) });
    const c = res.headers.getSetCookie().find((x) => x.startsWith("cf_session=")) ?? "";
    return /httponly/i.test(c) && /samesite=lax/i.test(c);
  });
  await check("search input is escaped and SQL-safe", async () => {
    const r = await anon.get(`/discover?q=${encodeURIComponent(`'; DROP TABLE projects; --<img src=x onerror=1>`)}`);
    return r.status === 200 && !r.html.includes("<img src=x") && (await anon.get("/discover")).html.includes('data-testid="project-card"');
  });
  await check("unknown API actions return 404", async () => (await alice.post("constructor", {})).status === 404 && (await alice.post("nope", {})).status === 404);
}

// ---------- report ----------
function render() {
  const failed = results.filter((r) => !r.ok);
  const lines = ["# Crownfunding remake report", "", `Run: ${new Date().toISOString()}`, ""];
  let current = "";
  for (const r of results) {
    if (r.area !== current) {
      current = r.area;
      const group = results.filter((x) => x.area === current);
      lines.push("", `## ${current} (${group.filter((x) => x.ok).length}/${group.length})`, "");
    }
    lines.push(`- ${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : `  — ${r.detail}`}`);
  }
  lines.push("", `**${results.length - failed.length} of ${results.length} checks passed.**`, "");
  lines.push(failed.length === 0 && results.length > 0 ? "REMAKE COMPLETE" : `REMAKE INCOMPLETE — ${failed.length} failing check(s)`);
  return { text: lines.join("\n") + "\n", ok: failed.length === 0 && results.length > 0 };
}

let exit = 1;
try {
  await boot();
  await run();
  const { text, ok } = render();
  writeFileSync(path.join(root, "REPORT.md"), text);
  console.log(text);
  exit = ok ? 0 : 1;
} catch (e) {
  console.error("Report could not run:", e);
  console.log("REMAKE INCOMPLETE — the report crashed before finishing");
} finally {
  shutdown();
}
process.exit(exit);
