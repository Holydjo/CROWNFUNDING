import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { currentUser } from "@/lib/auth";
import { money } from "@/lib/format";
import { projectsBackedBy, projectsCreatedBy, projectsSavedBy } from "@/lib/queries";
import { first, Flash, ProjectGrid, type SP } from "@/components/ui";

export const metadata: Metadata = { title: "Your dashboard" };

function Empty({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="card px-6 py-12 text-center">
      <p className="text-ink-soft">{text}</p>
      <Link href={href} className="btn btn-ghost mt-5">{cta}</Link>
    </div>
  );
}

export default async function Dashboard({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Fdashboard");
  const tab = ["backed", "created", "saved", "settings"].includes(first(sp.tab)) ? first(sp.tab) : "backed";
  const backed = projectsBackedBy(user.id);
  const created = projectsCreatedBy(user.id, true);
  const saved = projectsSavedBy(user.id);
  const tabs: [string, string, number?][] = [
    ["backed", "Backed", backed.length],
    ["created", "Created", created.length],
    ["saved", "Saved", saved.length],
    ["settings", "Settings"],
  ];
  const amounts = new Map(backed.map((b) => [b.id, b.my_amount]));

  return (
    <>
      <Flash sp={sp} />
      <div className="wrap pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display text-3xl font-bold sm:text-4xl">Hello, {user.name}</h1>
            <p className="mt-1 text-ink-soft">
              You&apos;ve pledged <span className="font-semibold text-ink" data-testid="total-pledged">{money(backed.reduce((s, b) => s + b.my_amount, 0))}</span> across {backed.length} {backed.length === 1 ? "project" : "projects"}.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/profile/${user.id}`} className="btn btn-ghost">Public profile</Link>
            <Link href="/start" className="btn btn-primary">Start a project</Link>
          </div>
        </div>

        <nav aria-label="Dashboard sections" className="mt-8 flex gap-6 overflow-x-auto border-b border-line text-sm font-semibold">
          {tabs.map(([key, label, count]) => (
            <Link key={key} href={key === "backed" ? "/dashboard" : `/dashboard?tab=${key}`} aria-current={tab === key ? "page" : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 pb-3 ${tab === key ? "border-royal text-royal" : "border-transparent text-ink-soft hover:text-ink"}`}>
              {label}{count !== undefined && <span className="ml-1.5 rounded-full bg-line px-1.5 py-0.5 text-xs text-ink-soft">{count}</span>}
            </Link>
          ))}
        </nav>

        <div className="mt-8" data-testid={`dash-${tab}`}>
          {tab === "backed" && (backed.length
            ? <ProjectGrid projects={backed} note={(p) => `You pledged ${money(amounts.get(p.id) ?? 0)}`} />
            : <Empty text="You haven't backed any projects yet." href="/discover" cta="Find something to back" />)}
          {tab === "created" && (created.length
            ? <ProjectGrid projects={created} />
            : <Empty text="You haven't started a project yet." href="/start" cta="Start a project" />)}
          {tab === "saved" && (saved.length
            ? <ProjectGrid projects={saved} />
            : <Empty text="Projects you save will show up here." href="/discover" cta="Browse projects" />)}
          {tab === "settings" && (
            <form action="/api/profile" method="post" className="card max-w-xl space-y-4 p-6">
              <h2 className="display text-2xl font-bold">Profile</h2>
              <div><label className="label" htmlFor="name">Name</label><input id="name" name="name" required minLength={2} maxLength={60} defaultValue={user.name} className="field" /></div>
              <div><label className="label" htmlFor="location">Location</label><input id="location" name="location" maxLength={80} defaultValue={user.location} className="field" /></div>
              <div><label className="label" htmlFor="bio">Biography</label><textarea id="bio" name="bio" rows={4} maxLength={500} defaultValue={user.bio} className="field" /></div>
              <p className="text-xs text-ink-soft">Signed in as {user.email}</p>
              <button type="submit" className="btn btn-primary">Save profile</button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
