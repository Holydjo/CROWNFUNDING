import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "How it works" };

const STEPS: [string, string][] = [
  ["Creators set a goal and a deadline", "Every project states how much it needs and how long it has — between 1 and 60 days — to raise it."],
  ["Backers pledge", "Choose a reward tier or pledge any amount without one. You can change or cancel your pledge any time before the deadline."],
  ["All or nothing", "If the project reaches its goal by the deadline, it's funded. If it falls short, no one is charged and the creator receives nothing."],
  ["Creators keep backers in the loop", "Updates, an FAQ and a comment thread open to backers keep everyone informed while the work gets made."],
];

export default function About() {
  return (
    <div className="wrap max-w-3xl pt-12">
      <h1 className="display text-4xl font-bold sm:text-5xl">How Crownfunding works</h1>
      <p className="mt-4 text-lg text-ink-soft">A simple deal between people who make things and people who want those things to exist.</p>
      <ol className="mt-10 space-y-4">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="card flex gap-5 p-6">
            <span className="display text-4xl font-bold text-royal">{i + 1}</span>
            <div><h2 className="text-lg font-semibold">{title}</h2><p className="mt-1 text-ink-soft">{body}</p></div>
          </li>
        ))}
      </ol>
      <p className="mt-8 rounded-xl border border-crown bg-crown-tint px-4 py-3 text-sm">
        This site is a demonstration. Pledges are recorded but no payment details are collected and no money moves.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/discover" className="btn btn-primary">Explore projects</Link>
        <Link href="/start" className="btn btn-ghost">Start a project</Link>
      </div>
    </div>
  );
}
