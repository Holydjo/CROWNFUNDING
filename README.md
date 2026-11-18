# Crownfunding

An all-or-nothing crowdfunding platform, built as an original remake of the Kickstarter product:
same feature set and flows, its own name, design, copy and (fictional) projects.

Pledges are simulated. No payment details are collected and no money moves.

## Run it

Requires Node 22.5+ (uses the built-in `node:sqlite`; developed on Node 24).

```bash
npm install
npm run dev        # http://localhost:3000
```

The SQLite database is created and seeded on first start at `data/crownfunding.db`
(override with `CROWNFUNDING_DB=/path/to/file.db`). Delete the file to reseed.

Demo account: `demo@crownfunding.test` / `crown-demo-2026` (defined in `src/lib/seed.ts`).

## What's in it

| Area | Features |
| --- | --- |
| Home | Hero, featured project, recommended / almost funded / home stretch / fresh launches, categories, site stats |
| Discover | Keyword search, 12 categories, live / successful / all filter, five sort orders, pagination |
| Project page | Funding box (pledged, % funded, backers, time left), story, risks, reward tiers with limits, FAQ, updates, comments, community |
| Backing | Pledge with or without a reward, change or cancel while live, sold-out limited rewards, all-or-nothing outcomes |
| Accounts | Sign up, log in, log out, public profile, dashboard (backed / created / saved / settings) |
| Creators | Draft, edit, add rewards, launch with a deadline, post updates, manage FAQ; goal locks at launch |
| Languages | English and French. French browsers get French automatically; the 🌐 button in the header (or the footer picker) switches and remembers the choice |

## Translations

All interface text, messages, numbers, money and dates live in `src/lib/i18n.ts` (one `en` and one `fr`
dictionary of the same shape; TypeScript flags any missing French string). Project content written by
creators — titles, stories, rewards, comments — is shown as written, in whatever language the creator used.

## The remake report

```bash
npm run report
```

Builds the app, boots it against a fresh temporary database, and drives every feature over HTTP
the way a browser would (forms and cookies). It writes `REPORT.md` and ends with `REMAKE COMPLETE`
only if every check passes; otherwise it lists the failures and exits non-zero.

## Stack

Next.js 16 (App Router, server components), React 19, Tailwind CSS 4, SQLite via `node:sqlite`.
Mutations are plain form posts to `src/app/api/[action]/route.ts`, so the site works without client-side JavaScript.
