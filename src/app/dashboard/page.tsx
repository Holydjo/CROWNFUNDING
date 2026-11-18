import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { currentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { projectsBackedBy, projectsCreatedBy, projectsSavedBy } from "@/lib/queries";
import { first, Flash, ProjectGrid, type SP } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).dash.metaTitle };
}

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
  const [user, t] = await Promise.all([currentUser(), getT()]);
  if (!user) redirect("/login?next=%2Fdashboard");
  const D = t.dash;
  const tab = ["backed", "created", "saved", "settings"].includes(first(sp.tab)) ? first(sp.tab) : "backed";
  const backed = projectsBackedBy(user.id);
  const created = projectsCreatedBy(user.id, true);
  const saved = projectsSavedBy(user.id);
  const tabs: [string, number?][] = [
    ["backed", backed.length],
    ["created", created.length],
    ["saved", saved.length],
    ["settings"],
  ];
  const amounts = new Map(backed.map((b) => [b.id, b.my_amount]));

  return (
    <>
      <Flash sp={sp} />
      <div className="wrap pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display text-3xl font-bold sm:text-4xl">{D.hello(user.name)}</h1>
            <p className="mt-1 text-ink-soft">
              {D.youPledged} <span className="font-semibold text-ink" data-testid="total-pledged">{t.money(backed.reduce((s, b) => s + b.my_amount, 0))}</span> {D.across(backed.length)}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/profile/${user.id}`} className="btn btn-ghost">{D.publicProfile}</Link>
            <Link href="/start" className="btn btn-primary">{t.nav.start}</Link>
          </div>
        </div>

        <nav aria-label={D.sections} className="mt-8 flex gap-6 overflow-x-auto border-b border-line text-sm font-semibold">
          {tabs.map(([key, count]) => (
            <Link key={key} href={key === "backed" ? "/dashboard" : `/dashboard?tab=${key}`} aria-current={tab === key ? "page" : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 pb-3 ${tab === key ? "border-royal text-royal" : "border-transparent text-ink-soft hover:text-ink"}`}>
              {D.tabs[key]}{count !== undefined && <span className="ml-1.5 rounded-full bg-line px-1.5 py-0.5 text-xs text-ink-soft">{count}</span>}
            </Link>
          ))}
        </nav>

        <div className="mt-8" data-testid={`dash-${tab}`}>
          {tab === "backed" && (backed.length
            ? <ProjectGrid projects={backed} note={(p) => D.note(t.money(amounts.get(p.id) ?? 0))} />
            : <Empty text={D.noBacked} href="/discover" cta={D.findBack} />)}
          {tab === "created" && (created.length
            ? <ProjectGrid projects={created} />
            : <Empty text={D.noCreated} href="/start" cta={t.nav.start} />)}
          {tab === "saved" && (saved.length
            ? <ProjectGrid projects={saved} />
            : <Empty text={D.noSaved} href="/discover" cta={D.browse} />)}
          {tab === "settings" && (
            <form action="/api/profile" method="post" className="card max-w-xl space-y-4 p-6">
              <h2 className="display text-2xl font-bold">{D.profile}</h2>
              <div><label className="label" htmlFor="name">{D.name}</label><input id="name" name="name" required minLength={2} maxLength={60} defaultValue={user.name} className="field" /></div>
              <div><label className="label" htmlFor="location">{D.location}</label><input id="location" name="location" maxLength={80} defaultValue={user.location} className="field" /></div>
              <div><label className="label" htmlFor="bio">{D.bio}</label><textarea id="bio" name="bio" rows={4} maxLength={500} defaultValue={user.bio} className="field" /></div>
              <p className="text-xs text-ink-soft">{D.signedInAs(user.email)}</p>
              <button type="submit" className="btn btn-primary">{D.saveProfile}</button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
