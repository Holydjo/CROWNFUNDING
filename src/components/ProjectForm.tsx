import { CATEGORIES } from "@/lib/categories";
import { getT } from "@/lib/i18n";
import type { Project } from "@/lib/queries";

/** Shared fields for creating and editing a project. Goal/title/category/duration lock once live. */
export async function ProjectFields({ project }: { project?: Project }) {
  const t = await getT();
  const F = t.form;
  const locked = project?.status === "live";
  return (
    <div className="space-y-5">
      {project && <input type="hidden" name="project_id" value={project.id} />}
      <div>
        <label className="label" htmlFor="title">{F.title}</label>
        <input id="title" name="title" required minLength={3} maxLength={120} defaultValue={project?.title} readOnly={locked} className="field" placeholder={F.titlePh} />
      </div>
      <div>
        <label className="label" htmlFor="blurb">{F.blurb}</label>
        <input id="blurb" name="blurb" maxLength={200} defaultValue={project?.blurb} className="field" placeholder={F.blurbPh} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="category">{F.category}</label>
          {locked ? (
            <>
              <input type="hidden" name="category" value={project.category} />
              <input id="category" readOnly value={t.category(project.category)} className="field" />
            </>
          ) : (
            <select id="category" name="category" required defaultValue={project?.category ?? ""} className="field">
              <option value="" disabled>{F.chooseCategory}</option>
              {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{t.category(c.slug)}</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="label" htmlFor="location">{F.location}</label>
          <input id="location" name="location" maxLength={80} defaultValue={project?.location} className="field" placeholder={F.locationPh} />
        </div>
        <div>
          <label className="label" htmlFor="goal">{F.goal}</label>
          <input id="goal" name="goal" type="number" min={1} max={10000000} step={1} required defaultValue={project?.goal} readOnly={locked} className="field" placeholder="5000" />
        </div>
        <div>
          <label className="label" htmlFor="duration_days">{F.duration}</label>
          <input id="duration_days" name="duration_days" type="number" min={1} max={60} step={1} required defaultValue={project?.duration_days ?? 30} readOnly={locked} className="field" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="image_url">{F.image} <span className="font-normal text-ink-soft">{F.imageHint}</span></label>
        <input id="image_url" name="image_url" type="url" maxLength={500} defaultValue={project?.image_url} className="field" placeholder={F.imagePh} />
      </div>
      <div>
        <label className="label" htmlFor="story">{F.story}</label>
        <textarea id="story" name="story" rows={10} maxLength={20000} defaultValue={project?.story} className="field" placeholder={F.storyPh} />
      </div>
      <div>
        <label className="label" htmlFor="risks">{F.risks}</label>
        <textarea id="risks" name="risks" rows={4} maxLength={5000} defaultValue={project?.risks} className="field" placeholder={F.risksPh} />
      </div>
      {locked && <p className="text-xs text-ink-soft">{F.locked}</p>}
    </div>
  );
}
