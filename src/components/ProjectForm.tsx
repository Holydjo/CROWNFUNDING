import { CATEGORIES } from "@/lib/categories";
import type { Project } from "@/lib/queries";

/** Shared fields for creating and editing a project. Goal/title/category/duration lock once live. */
export function ProjectFields({ project }: { project?: Project }) {
  const locked = project?.status === "live";
  return (
    <div className="space-y-5">
      {project && <input type="hidden" name="project_id" value={project.id} />}
      <div>
        <label className="label" htmlFor="title">Project title</label>
        <input id="title" name="title" required minLength={3} maxLength={120} defaultValue={project?.title} readOnly={locked} className="field" placeholder="A clear, specific name for what you're making" />
      </div>
      <div>
        <label className="label" htmlFor="blurb">Short blurb</label>
        <input id="blurb" name="blurb" maxLength={200} defaultValue={project?.blurb} className="field" placeholder="One sentence that makes people want to read more" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="category">Category</label>
          {locked ? (
            <input id="category" name="category" readOnly defaultValue={project?.category} className="field" />
          ) : (
            <select id="category" name="category" required defaultValue={project?.category ?? ""} className="field">
              <option value="" disabled>Choose a category</option>
              {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="label" htmlFor="location">Location</label>
          <input id="location" name="location" maxLength={80} defaultValue={project?.location} className="field" placeholder="City, Country" />
        </div>
        <div>
          <label className="label" htmlFor="goal">Funding goal (USD)</label>
          <input id="goal" name="goal" type="number" min={1} max={10000000} step={1} required defaultValue={project?.goal} readOnly={locked} className="field" placeholder="5000" />
        </div>
        <div>
          <label className="label" htmlFor="duration_days">Campaign duration (days)</label>
          <input id="duration_days" name="duration_days" type="number" min={1} max={60} step={1} required defaultValue={project?.duration_days ?? 30} readOnly={locked} className="field" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="image_url">Cover image URL <span className="font-normal text-ink-soft">(optional, https)</span></label>
        <input id="image_url" name="image_url" type="url" maxLength={500} defaultValue={project?.image_url} className="field" placeholder="Leave blank for generated cover art" />
      </div>
      <div>
        <label className="label" htmlFor="story">Story</label>
        <textarea id="story" name="story" rows={10} maxLength={20000} defaultValue={project?.story} className="field" placeholder={"What are you making, and why?\n\nUse ## for section headings and - for list items."} />
      </div>
      <div>
        <label className="label" htmlFor="risks">Risks and challenges</label>
        <textarea id="risks" name="risks" rows={4} maxLength={5000} defaultValue={project?.risks} className="field" placeholder="Be honest about what could go wrong and how you'll handle it." />
      </div>
      {locked && <p className="text-xs text-ink-soft">Title, category, goal and duration are locked once a campaign is live.</p>}
    </div>
  );
}
