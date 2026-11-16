import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { dateLabel } from "@/lib/format";
import { getUser, projectsBackedBy, projectsCreatedBy } from "@/lib/queries";
import { ProjectGrid } from "@/components/ui";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const u = /^\d+$/.test(id) ? getUser(Number(id)) : undefined;
  return { title: u?.name ?? "Profile" };
}

export default async function Profile({ params }: Props) {
  const { id } = await params;
  const user = /^\d+$/.test(id) ? getUser(Number(id)) : undefined;
  if (!user) notFound();
  const created = projectsCreatedBy(user.id, false);
  const backed = projectsBackedBy(user.id).filter((p) => p.status === "live");

  return (
    <div className="wrap pt-10">
      <div className="flex items-center gap-5">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-royal-tint text-3xl font-bold text-royal">{user.name.slice(0, 1).toUpperCase()}</span>
        <div>
          <h1 className="display text-3xl font-bold sm:text-4xl" data-testid="profile-name">{user.name}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {user.location && <>{user.location} • </>}Joined {dateLabel(user.created_at)} • Backed {backed.length} • Created {created.length}
          </p>
        </div>
      </div>
      {user.bio && <p className="mt-6 max-w-2xl whitespace-pre-line text-ink-soft">{user.bio}</p>}

      <h2 className="display mb-6 mt-12 text-2xl font-bold">Created projects</h2>
      {created.length ? <ProjectGrid projects={created} /> : <p className="text-ink-soft">No projects created yet.</p>}

      <h2 className="display mb-6 mt-12 text-2xl font-bold">Backed projects</h2>
      {backed.length ? <ProjectGrid projects={backed.slice(0, 12)} /> : <p className="text-ink-soft">No backed projects yet.</p>}
    </div>
  );
}
