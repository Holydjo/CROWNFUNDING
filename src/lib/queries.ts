import { getDb } from "./db";

export type ProjectState = "draft" | "live" | "successful" | "unsuccessful";

export type Project = {
  id: number;
  slug: string;
  creator_id: number;
  creator_name: string;
  title: string;
  blurb: string;
  category: string;
  location: string;
  image_url: string;
  story: string;
  risks: string;
  goal: number;
  duration_days: number;
  status: string;
  featured: number;
  created_at: number;
  launched_at: number | null;
  deadline: number | null;
  pledged: number;
  backers: number;
};

export type Reward = {
  id: number;
  project_id: number;
  title: string;
  description: string;
  amount: number;
  delivery: string;
  limit_qty: number | null;
  claimed: number;
};

export type Pledge = {
  id: number;
  project_id: number;
  user_id: number;
  reward_id: number | null;
  amount: number;
  created_at: number;
};

const BASE = `
  SELECT p.*, u.name AS creator_name,
         COALESCE(s.pledged, 0) AS pledged, COALESCE(s.backers, 0) AS backers
  FROM projects p
  JOIN users u ON u.id = p.creator_id
  LEFT JOIN (SELECT project_id, SUM(amount) AS pledged, COUNT(*) AS backers FROM pledges GROUP BY project_id) s
    ON s.project_id = p.id
`;

function all<T>(sql: string, ...params: (string | number | null)[]): T[] {
  return getDb().prepare(sql).all(...params) as T[];
}
function one<T>(sql: string, ...params: (string | number | null)[]): T | undefined {
  return getDb().prepare(sql).get(...params) as T | undefined;
}

export function projectState(p: Pick<Project, "status" | "deadline" | "pledged" | "goal">, now = Date.now()): ProjectState {
  if (p.status !== "live" || !p.deadline) return "draft";
  if (p.deadline > now) return "live";
  return p.pledged >= p.goal ? "successful" : "unsuccessful";
}

export function getProjectBySlug(slug: string): Project | undefined {
  return one<Project>(`${BASE} WHERE p.slug = ?`, slug);
}
export function getProjectById(id: number): Project | undefined {
  return one<Project>(`${BASE} WHERE p.id = ?`, id);
}

export const SORTS = ["magic", "popularity", "newest", "end_date", "most_funded"] as const;
export type Sort = (typeof SORTS)[number];

export const STATES = ["live", "successful", "all"] as const;
export type StateFilter = (typeof STATES)[number];

export const PAGE_SIZE = 12;

export function discover(opts: {
  q?: string;
  category?: string;
  sort?: Sort;
  state?: StateFilter;
  page?: number;
}): { projects: Project[]; total: number } {
  const now = Date.now();
  const where: string[] = ["p.status = 'live'"];
  const params: (string | number)[] = [];
  const state = opts.state ?? "live";
  if (state === "live") {
    where.push("p.deadline > ?");
    params.push(now);
  } else if (state === "successful") {
    where.push("p.deadline <= ? AND COALESCE(s.pledged, 0) >= p.goal");
    params.push(now);
  }
  if (opts.category) {
    where.push("p.category = ?");
    params.push(opts.category);
  }
  if (opts.q) {
    const like = `%${opts.q.replace(/[%_\\]/g, (m) => "\\" + m)}%`;
    where.push(
      "(p.title LIKE ? ESCAPE '\\' OR p.blurb LIKE ? ESCAPE '\\' OR u.name LIKE ? ESCAPE '\\' OR p.location LIKE ? ESCAPE '\\' OR p.category LIKE ? ESCAPE '\\')"
    );
    params.push(like, like, like, like, like);
  }
  const order = {
    magic: "p.featured DESC, (p.deadline > " + now + ") DESC, (COALESCE(s.backers, 0) * 1.0 / (1 + (" + now + " - p.launched_at) / 86400000.0)) DESC",
    popularity: "backers DESC",
    newest: "p.launched_at DESC",
    end_date: "(p.deadline > " + now + ") DESC, p.deadline ASC",
    most_funded: "pledged DESC",
  }[opts.sort ?? "magic"];
  const w = where.join(" AND ");
  const page = Math.max(1, opts.page ?? 1);
  const total =
    one<{ n: number }>(
      `SELECT COUNT(*) AS n FROM projects p JOIN users u ON u.id = p.creator_id
       LEFT JOIN (SELECT project_id, SUM(amount) AS pledged FROM pledges GROUP BY project_id) s ON s.project_id = p.id
       WHERE ${w}`,
      ...params
    )?.n ?? 0;
  const projects = all<Project>(
    `${BASE} WHERE ${w} ORDER BY ${order}, p.id ASC LIMIT ? OFFSET ?`,
    ...params,
    PAGE_SIZE,
    (page - 1) * PAGE_SIZE
  );
  return { projects, total };
}

export function liveProjects(orderBy: string, limit: number, extraWhere = "1 = 1"): Project[] {
  return all<Project>(
    `${BASE} WHERE p.status = 'live' AND p.deadline > ? AND ${extraWhere} ORDER BY ${orderBy} LIMIT ?`,
    Date.now(),
    limit
  );
}

export function featuredProject(): Project | undefined {
  return liveProjects("p.featured DESC, backers DESC", 1)[0];
}

export function siteStats(): { projects: number; pledged: number; pledges: number } {
  const a = one<{ n: number }>("SELECT COUNT(*) AS n FROM projects WHERE status = 'live'")!;
  const b = one<{ total: number; n: number }>("SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS n FROM pledges")!;
  return { projects: a.n, pledged: b.total, pledges: b.n };
}

export function rewardsFor(projectId: number): Reward[] {
  return all<Reward>(
    `SELECT r.*, (SELECT COUNT(*) FROM pledges pl WHERE pl.reward_id = r.id) AS claimed
     FROM rewards r WHERE r.project_id = ? ORDER BY r.amount ASC, r.id ASC`,
    projectId
  );
}
export function getReward(id: number): Reward | undefined {
  return one<Reward>(
    `SELECT r.*, (SELECT COUNT(*) FROM pledges pl WHERE pl.reward_id = r.id) AS claimed FROM rewards r WHERE r.id = ?`,
    id
  );
}

export function pledgeOf(projectId: number, userId: number): Pledge | undefined {
  return one<Pledge>("SELECT * FROM pledges WHERE project_id = ? AND user_id = ?", projectId, userId);
}

export type Update = { id: number; project_id: number; title: string; body: string; created_at: number };
export function updatesFor(projectId: number): Update[] {
  return all<Update>("SELECT * FROM updates WHERE project_id = ? ORDER BY created_at DESC, id DESC", projectId);
}

export type Comment = { id: number; user_id: number; user_name: string; body: string; created_at: number; is_creator: number };
export function commentsFor(projectId: number): Comment[] {
  return all<Comment>(
    `SELECT c.id, c.user_id, u.name AS user_name, c.body, c.created_at, (c.user_id = p.creator_id) AS is_creator
     FROM comments c JOIN users u ON u.id = c.user_id JOIN projects p ON p.id = c.project_id
     WHERE c.project_id = ? ORDER BY c.created_at DESC, c.id DESC`,
    projectId
  );
}

export type Faq = { id: number; question: string; answer: string };
export function faqsFor(projectId: number): Faq[] {
  return all<Faq>("SELECT id, question, answer FROM faqs WHERE project_id = ? ORDER BY id ASC", projectId);
}

export function counts(projectId: number): { updates: number; comments: number; faqs: number } {
  return one<{ updates: number; comments: number; faqs: number }>(
    `SELECT (SELECT COUNT(*) FROM updates WHERE project_id = ?) AS updates,
            (SELECT COUNT(*) FROM comments WHERE project_id = ?) AS comments,
            (SELECT COUNT(*) FROM faqs WHERE project_id = ?) AS faqs`,
    projectId,
    projectId,
    projectId
  )!;
}

export function recentBackers(projectId: number, limit = 12): { id: number; name: string; created_at: number }[] {
  return all(
    `SELECT u.id, u.name, pl.created_at FROM pledges pl JOIN users u ON u.id = pl.user_id
     WHERE pl.project_id = ? ORDER BY pl.created_at DESC LIMIT ?`,
    projectId,
    limit
  );
}

export function isSaved(projectId: number, userId: number): boolean {
  return !!one("SELECT 1 AS x FROM saves WHERE project_id = ? AND user_id = ?", projectId, userId);
}

export function projectsCreatedBy(userId: number, includeDrafts: boolean): Project[] {
  return all<Project>(
    `${BASE} WHERE p.creator_id = ? ${includeDrafts ? "" : "AND p.status = 'live'"} ORDER BY p.created_at DESC`,
    userId
  );
}
export function projectsBackedBy(userId: number): (Project & { my_amount: number })[] {
  return all(
    `SELECT b.*, mine.amount AS my_amount FROM (${BASE}) b JOIN pledges mine ON mine.project_id = b.id
     WHERE mine.user_id = ? ORDER BY mine.created_at DESC`,
    userId
  );
}
export function projectsSavedBy(userId: number): Project[] {
  return all<Project>(
    `SELECT b.* FROM (${BASE}) b JOIN saves sv ON sv.project_id = b.id WHERE sv.user_id = ? ORDER BY sv.created_at DESC`,
    userId
  );
}

export function getUser(id: number): { id: number; name: string; bio: string; location: string; created_at: number } | undefined {
  return one("SELECT id, name, bio, location, created_at FROM users WHERE id = ?", id);
}

export function uniqueSlug(base: string): string {
  let slug = base;
  let i = 2;
  while (one("SELECT 1 AS x FROM projects WHERE slug = ?", slug)) slug = `${base}-${i++}`;
  return slug;
}
