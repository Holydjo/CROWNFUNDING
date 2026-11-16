import Link from "next/link";
import { categoryBySlug } from "@/lib/categories";
import { money, percent, shortTimeLeft } from "@/lib/format";
import { projectState, type Project, type ProjectState } from "@/lib/queries";

export type SP = Promise<{ [key: string]: string | string[] | undefined }>;

export function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export function Flash({ sp }: { sp: { [key: string]: string | string[] | undefined } }) {
  const error = first(sp.error);
  const notice = first(sp.notice);
  if (!error && !notice) return null;
  return (
    <div className="wrap pt-4">
      <p
        role={error ? "alert" : "status"}
        data-testid={error ? "flash-error" : "flash-notice"}
        className={`rounded-xl border px-4 py-3 text-sm font-medium ${
          error ? "border-bad/30 bg-bad/5 text-bad" : "border-good/30 bg-good/5 text-good"
        }`}
      >
        {error || notice}
      </p>
    </div>
  );
}

/** Generated cover art, used when a project has no image of its own. */
export function Cover({ project, className = "" }: { project: Pick<Project, "id" | "category" | "image_url" | "title">; className?: string }) {
  if (project.image_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={project.image_url} alt={project.title} className={`h-full w-full object-cover ${className}`} />
    );
  }
  const cat = categoryBySlug(project.category);
  const h1 = (cat.hue + ((project.id * 11) % 36) - 18 + 360) % 360;
  const h2 = (h1 + 40 + (project.id % 5) * 12) % 360;
  const r = 18 + (project.id % 4) * 6;
  return (
    <div
      role="img"
      aria-label={`${cat.name} project cover`}
      className={`relative h-full w-full overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, hsl(${h1} 62% 46%), hsl(${h2} 70% 30%))` }}
    >
      <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <circle cx={120 - (project.id % 3) * 20} cy={22 + (project.id % 4) * 6} r={r} fill={`hsl(${h2} 85% 70% / 0.35)`} />
        <circle cx={30 + (project.id % 5) * 9} cy={74} r={r + 14} fill={`hsl(${h1} 90% 78% / 0.22)`} />
        <path d={`M0 ${64 - (project.id % 3) * 6} Q 40 ${44 + (project.id % 4) * 5} 80 62 T 160 ${52 + (project.id % 5) * 3} V 90 H 0 Z`} fill="rgb(0 0 0 / 0.18)" />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[clamp(2.5rem,7vw,5rem)] drop-shadow-lg" aria-hidden="true">
        {cat.emoji}
      </span>
    </div>
  );
}

export function Progress({ pledged, goal }: { pledged: number; goal: number }) {
  const pct = percent(pledged, goal);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.min(pct, 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct}% funded`}>
      <div className={`h-full rounded-full ${pct >= 100 ? "bg-good" : "bg-royal"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export function StateBadge({ state }: { state: ProjectState }) {
  const map: Record<ProjectState, [string, string]> = {
    draft: ["Draft", "bg-crown-tint text-ink"],
    live: ["Live", "bg-royal-tint text-royal"],
    successful: ["Successfully funded", "bg-good/10 text-good"],
    unsuccessful: ["Funding unsuccessful", "bg-bad/10 text-bad"],
  };
  const [label, cls] = map[state];
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{label}</span>;
}

export function ProjectCard({ project, note }: { project: Project; note?: string }) {
  const state = projectState(project);
  const pct = percent(project.pledged, project.goal);
  const cat = categoryBySlug(project.category);
  const href = state === "draft" ? `/projects/${project.slug}/edit` : `/projects/${project.slug}`;
  return (
    <article className="group flex flex-col" data-testid="project-card">
      <Link href={href} className="block aspect-video overflow-hidden rounded-xl border border-line">
        <Cover project={project} className="transition-transform duration-300 group-hover:scale-[1.03]" />
      </Link>
      <div className="mt-3">
        <Progress pledged={project.pledged} goal={project.goal} />
      </div>
      <h3 className="mt-3 text-base font-semibold leading-snug">
        <Link href={href} className="hover:text-royal">{project.title}</Link>
      </h3>
      <p className="mt-1 text-sm text-ink-soft">{project.creator_name}</p>
      <p className="mt-1 text-sm text-ink-soft">
        {state === "live" ? (
          <>
            {shortTimeLeft(project.deadline)} • <span className={pct >= 100 ? "font-semibold text-good" : ""}>{pct}% funded</span>
          </>
        ) : state === "draft" ? (
          "Draft — not launched"
        ) : (
          <>
            {state === "successful" ? "Funded" : "Ended"} • {pct}% of {money(project.goal)}
          </>
        )}
      </p>
      <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{project.blurb}</p>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
        <Link href={`/discover?category=${cat.slug}`} className="rounded-full border border-line px-2 py-0.5 hover:border-royal hover:text-royal">{cat.name}</Link>
        {project.location && <span>{project.location}</span>}
        {note && <span className="rounded-full bg-crown-tint px-2 py-0.5 font-semibold text-ink">{note}</span>}
      </p>
    </article>
  );
}

export function ProjectGrid({ projects, note }: { projects: Project[]; note?: (p: Project) => string | undefined }) {
  return (
    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <ProjectCard key={p.id} project={p} note={note?.(p)} />
      ))}
    </div>
  );
}

/** Minimal, safe renderer: "## " headings, "- " lists, paragraphs. */
export function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-4 text-[15px] leading-7 text-ink">
      {blocks.map((b, i) => {
        if (b.startsWith("## ")) return <h3 key={i} className="display pt-3 text-2xl font-bold">{b.slice(3)}</h3>;
        const lines = b.split("\n");
        if (lines.every((l) => l.startsWith("- ")))
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => <li key={j}>{l.slice(2)}</li>)}
            </ul>
          );
        return <p key={i} className="whitespace-pre-line">{b}</p>;
      })}
    </div>
  );
}
