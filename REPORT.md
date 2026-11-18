# Crownfunding remake report

Run: 2026-11-18T02:23:18.928Z


## Home page (6/6)

- PASS  renders with hero and calls to action
- PASS  featured project spotlight
- PASS  curated rows: recommended, almost funded, home stretch, fresh
- PASS  category navigation (12 categories)
- PASS  site-wide funding stats
- PASS  project cards show progress, time left and % funded

## Discover & search (10/10)

- PASS  lists live projects, 12 per page
- PASS  pagination
- PASS  category filter
- PASS  keyword search (title, creator, location)
- PASS  empty state for no results
- PASS  sort by most funded is descending
- PASS  sort by end date puts soonest deadline first
- PASS  sort by newest and popularity respond
- PASS  filter: successfully funded campaigns
- PASS  filter: all campaigns includes ended ones

## Project page (14/14)

- PASS  title, blurb, creator, category and location
- PASS  funding box: pledged, goal, % funded, backers, time left
- PASS  all-or-nothing notice
- PASS  story and risks sections
- PASS  reward tiers with price, delivery, backer counts and limits
- PASS  rewards tab
- PASS  faq tab
- PASS  updates tab
- PASS  comments tab
- PASS  community tab
- PASS  successful campaign shows funded state and takes no pledges
- PASS  unsuccessful campaign shows it fell short and nobody was charged
- PASS  unknown project and unknown page return 404
- PASS  creator profile page

## Accounts (8/8)

- PASS  sign up creates an account and signs in
- PASS  sign up validation: duplicate email, short password, bad email
- PASS  log out ends the session
- PASS  log in rejects a wrong password
- PASS  log in with correct password, returning to the requested page
- PASS  seeded demo account can sign in
- PASS  members-only pages send visitors to log in
- PASS  profile settings update the public profile

## Backing a project (10/10)

- PASS  pledge page lists no-reward option and every tier
- PASS  pledging for a reward raises pledged total and backer count
- PASS  a pledge below the reward's price is rejected
- PASS  invalid amounts are rejected (zero, negative, text)
- PASS  pledge without a reward
- PASS  changing a pledge updates the total without double counting
- PASS  backed project appears in the backer's dashboard with the amount
- PASS  cancelling a pledge restores the totals
- PASS  ended campaigns reject new pledges
- PASS  a reward from another project can't be claimed

## Saving projects (1/1)

- PASS  save for later, see it in the dashboard, then unsave

## Comments (2/2)

- PASS  only backers can comment
- PASS  a backer's comment is published, with HTML escaped

## Creator tools (20/20)

- PASS  project form validation (title, category, goal, duration)
- PASS  create a draft project
- PASS  drafts are private: hidden from visitors, search and other users
- PASS  a draft can't launch without a reward
- PASS  only the creator can edit, add rewards or launch
- PASS  edit a draft's basics
- PASS  add rewards, including a limited one; remove an unclaimed one
- PASS  launch makes the project public with a running deadline
- PASS  launched project is discoverable (newest first, and by search)
- PASS  goal, title and duration are locked after launch
- PASS  creators can't back their own project
- PASS  limited rewards sell out
- PASS  the holder of a sold-out reward can still adjust their pledge
- PASS  reaching the goal shows as funded progress
- PASS  a reward with backers can't be removed
- PASS  a launched project can't be deleted
- PASS  creator posts an update; others cannot
- PASS  creator adds an FAQ entry; others cannot
- PASS  creator can comment on their own project and is labelled
- PASS  creator dashboard lists created projects; draft can be deleted

## French (8/8)

- PASS  a French-speaking browser gets French by default
- PASS  other browsers get English
- PASS  the language switch saves French and returns to the same page
- PASS  French project page: labels, money, dates, time left
- PASS  French on every main page
- PASS  messages after actions are in French
- PASS  switching back to English
- PASS  the switch ignores unknown languages and off-site return addresses

## Safety (5/5)

- PASS  cross-site form posts are blocked
- PASS  login never redirects off-site
- PASS  session cookie is HttpOnly and SameSite=Lax
- PASS  search input is escaped and SQL-safe
- PASS  unknown API actions return 404

**84 of 84 checks passed.**

REMAKE COMPLETE
