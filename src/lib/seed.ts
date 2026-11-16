import type { DatabaseSync } from "node:sqlite";
import { hashPassword } from "./password";

// All seed content is fictional demo data.
export const DEMO_EMAIL = "demo@crownfunding.test";
export const DEMO_PASSWORD = "crown-demo-2026";

const DAY = 86_400_000;

type SeedProject = {
  title: string;
  blurb: string;
  category: string;
  location: string;
  creator: string;
  goal: number;
  /** days until deadline; negative = already ended */
  daysLeft: number;
  /** pledged / goal */
  ratio: number;
  tiers: [string, number][];
  featured?: boolean;
};

const PROJECTS: SeedProject[] = [
  { title: "Lanternfall: A Cooperative Game of Light and Tide", blurb: "Guide a drowned city's last lamplighters through rising water in this 1–4 player cooperative board game.", category: "games", location: "Lyon, France", creator: "Marée Haute Games", goal: 18000, daysLeft: 6, ratio: 4.6, featured: true, tiers: [["Print & play", 12], ["The game", 49], ["Deluxe lamplighter edition", 89], ["Collector's flood box", 160]] },
  { title: "Pocket Loom — Weave Anywhere", blurb: "A folding beechwood loom that fits in a coat pocket, with patterns for your first ten weaves.", category: "crafts", location: "Porto, Portugal", creator: "Atelier Fio", goal: 9000, daysLeft: 21, ratio: 1.35, tiers: [["Pattern booklet (PDF)", 8], ["Pocket Loom", 38], ["Loom + dyed yarn set", 64], ["Workshop bundle (5 looms)", 170]] },
  { title: "Saltwater Radio: Debut LP on Vinyl", blurb: "Ten songs recorded live in a lighthouse keeper's cottage, pressed on sea-glass green vinyl.", category: "music", location: "Halifax, Canada", creator: "Saltwater Radio", goal: 12000, daysLeft: 9, ratio: 0.88, tiers: [["Digital album", 10], ["Vinyl LP", 32], ["Signed vinyl + lyric zine", 55], ["House concert", 900]] },
  { title: "The Night Bakers — A Documentary", blurb: "A feature documentary following four bakeries through the hours when the rest of the city sleeps.", category: "film", location: "Marseille, France", creator: "Camille Roussel", goal: 40000, daysLeft: 15, ratio: 0.71, tiers: [["Thank-you credit", 15], ["Digital screening", 30], ["Screening + recipe book", 60], ["Associate producer credit", 500]] },
  { title: "Orbit Desk Lamp: Light That Follows the Sun", blurb: "An aluminium desk lamp that shifts colour temperature through the day to match daylight outside.", category: "design", location: "Copenhagen, Denmark", creator: "Studio Halvmåne", goal: 30000, daysLeft: 27, ratio: 2.9, tiers: [["Early supporter", 5], ["Orbit Lamp — early bird", 119], ["Orbit Lamp", 139], ["Studio pair", 259]] },
  { title: "Field Notes on Moss: An Illustrated Guide", blurb: "A clothbound guide to 120 mosses and liverworts, with 300 watercolour plates.", category: "publishing", location: "Edinburgh, UK", creator: "Thistle & Fern Press", goal: 15000, daysLeft: 12, ratio: 3.2, tiers: [["Ebook", 14], ["Hardback", 36], ["Hardback + print set", 58], ["Named in the acknowledgements", 120]] },
  { title: "Tinker Board: The Solder-Free Synth Kit", blurb: "Build a real analogue synthesizer in an afternoon with snap-together modules. No soldering iron needed.", category: "technology", location: "Berlin, Germany", creator: "Klangwerk Labs", goal: 45000, daysLeft: 18, ratio: 1.9, tiers: [["Sticker pack", 6], ["Starter kit", 95], ["Full kit", 165], ["Classroom set (6 kits)", 840]] },
  { title: "Ravens of the Ninth Bridge — Graphic Novel", blurb: "A 180-page fantasy heist about a guild of messenger ravens and the girl who speaks for them.", category: "comics", location: "Montréal, Canada", creator: "Inès Lavoie", goal: 14000, daysLeft: 3, ratio: 0.96, tiers: [["PDF edition", 12], ["Softcover", 28], ["Hardcover + bookplate", 48], ["Original inked page", 320]] },
  { title: "Ember & Rye: A Neighbourhood Sourdough Kitchen", blurb: "Help us fit out a shared bakery where neighbours can learn, bake and take home bread at cost.", category: "food", location: "Ghent, Belgium", creator: "Ember & Rye Collective", goal: 25000, daysLeft: 24, ratio: 0.42, tiers: [["A loaf with your name on it", 10], ["Starter culture + guide", 25], ["Baking class for two", 80], ["Founding member", 250]] },
  { title: "Paper Constellations: Hand-Cut Star Maps", blurb: "Layered paper star charts of both hemispheres, cut by hand and framed in ash.", category: "art", location: "Kyoto, Japan", creator: "Mika Aoyama", goal: 6000, daysLeft: 30, ratio: 0.3, tiers: [["Postcard set", 9], ["A5 print", 30], ["Framed northern sky", 140], ["Framed pair", 260]] },
  { title: "The Wool Coat Project: Made to Last 30 Years", blurb: "One coat, three colours, mill-traceable wool, and a repair guarantee that outlives the trend cycle.", category: "fashion", location: "Biella, Italy", creator: "Lanificio Nord", goal: 50000, daysLeft: 10, ratio: 1.52, tiers: [["Wool scarf", 45], ["The coat — early bird", 290], ["The coat", 340], ["Coat + scarf + care kit", 395]] },
  { title: "Understudies: A New Musical in One Room", blurb: "Six actors, one dressing room, and the opening night nobody rehearsed for. A new chamber musical.", category: "theater", location: "Dublin, Ireland", creator: "Greenroom Company", goal: 20000, daysLeft: 5, ratio: 0.9, tiers: [["Programme credit", 15], ["Cast recording", 25], ["Opening week ticket", 45], ["Open rehearsal + dinner", 300]] },
  { title: "Dice of the Deep: Hand-Poured Ocean Resin Dice", blurb: "Seven-piece polyhedral sets with real sand and shell suspended in layered ocean resin.", category: "games", location: "Lisbon, Portugal", creator: "Tidepool Dice Co.", goal: 5000, daysLeft: 14, ratio: 7.8, tiers: [["Single d20", 14], ["Seven-piece set", 42], ["Two sets + dice tray", 95], ["Guild box (6 sets)", 230]] },
  { title: "Slow Cycle: A Bikepacking Cookbook", blurb: "Sixty one-pot recipes developed on the road, with route notes from 9,000 km across Europe.", category: "publishing", location: "Ljubljana, Slovenia", creator: "Nika Zupan", goal: 11000, daysLeft: 2, ratio: 0.93, tiers: [["Ebook", 12], ["Paperback", 27], ["Paperback + route maps", 44], ["Signed, with a spice tin", 70]] },
  { title: "Glasshouse: An Ambient Album Grown from Plant Signals", blurb: "Electrodes on fern leaves, a modular synth, and forty minutes of music composed by a greenhouse.", category: "music", location: "Utrecht, Netherlands", creator: "Hortus Sound", goal: 7000, daysLeft: 19, ratio: 0.64, tiers: [["Digital album", 9], ["Cassette", 18], ["Vinyl LP", 34], ["Vinyl + a cutting from the greenhouse", 60]] },
  { title: "Kite Sensor: Open-Source Air Quality for Schools", blurb: "A palm-sized, open-hardware air monitor with lesson plans, built for classrooms.", category: "technology", location: "Nairobi, Kenya", creator: "Upepo Labs", goal: 35000, daysLeft: 33, ratio: 0.22, tiers: [["Supporter", 10], ["One Kite Sensor", 69], ["Sensor + sponsor a classroom", 129], ["School pack (10 sensors)", 590]] },
  { title: "Small Hours: An Animated Short", blurb: "A hand-painted short film about a night-bus driver and the passengers only she can see.", category: "film", location: "Warsaw, Poland", creator: "Studio Cma", goal: 22000, daysLeft: 8, ratio: 1.12, tiers: [["Thank-you credit", 10], ["Digital film + artbook PDF", 25], ["Printed artbook", 55], ["Painted production cel", 400]] },
  { title: "Mend: A Visible Mending Kit", blurb: "Everything you need to darn, patch and embroider your clothes back to life, in a waxed canvas roll.", category: "crafts", location: "Bristol, UK", creator: "Second Stitch", goal: 8000, daysLeft: 16, ratio: 2.1, tiers: [["Mending guide (PDF)", 7], ["Mend kit", 42], ["Kit + sashiko thread set", 62], ["Repair café pack (4 kits)", 150]] },
  { title: "Atlas of Imaginary Islands — Risograph Prints", blurb: "Twelve invented islands, charted in four-colour risograph with tide tables that almost make sense.", category: "art", location: "Valparaíso, Chile", creator: "Tomás Herrera", goal: 4000, daysLeft: 22, ratio: 1.75, tiers: [["Three postcards", 8], ["One island print", 24], ["Set of four", 80], ["Complete atlas portfolio", 210]] },
  { title: "Hearthside: A Cozy Farming Card Game", blurb: "Plant, trade and feast through four seasons in a 30-minute card game for 2–5 players.", category: "games", location: "Tampere, Finland", creator: "Kettu Games", goal: 10000, daysLeft: 11, ratio: 0.78, tiers: [["Print & play", 9], ["The game", 26], ["Game + playmat", 49], ["Game night bundle (3 copies)", 68]] },
  // Ended campaigns
  { title: "Marginalia: A Fountain Pen for Left-Handers", blurb: "A fast-drying, angled-nib fountain pen designed with and for left-handed writers.", category: "design", location: "Vienna, Austria", creator: "Linkshand Studio", goal: 16000, daysLeft: -12, ratio: 2.4, tiers: [["Ink sampler", 12], ["The pen", 58], ["Pen + notebook", 76], ["Engraved pair", 140]] },
  { title: "Brass & Bellows: Street Band World Tour Film", blurb: "A concert film following a nine-piece street brass band across four continents.", category: "film", location: "New Orleans, USA", creator: "Second Line Films", goal: 60000, daysLeft: -30, ratio: 0.37, tiers: [["Thank-you credit", 15], ["Digital film", 25], ["Film + live album", 50], ["Private screening", 750]] },
  { title: "The Paper Lighthouse — A Pop-Up Book", blurb: "A storm, a keeper and a very small boat, told across seven engineered pop-up spreads.", category: "publishing", location: "Bergen, Norway", creator: "Fyr Forlag", goal: 13000, daysLeft: -5, ratio: 1.18, tiers: [["Poster", 12], ["The book", 39], ["Signed book", 55], ["Book + original paper model", 280]] },
  { title: "Zero-Waste Ramen Bar Pop-Up", blurb: "A six-week pop-up serving ramen built entirely from surplus produce and whole-animal broth.", category: "food", location: "Melbourne, Australia", creator: "Scrap Noodle", goal: 9000, daysLeft: -20, ratio: 1.6, tiers: [["Chopstick set", 12], ["Dinner for one", 30], ["Dinner for two", 55], ["Chef's counter for four", 240]] },
];

const FIRST = ["Aiko", "Mateo", "Lena", "Omar", "Priya", "Jonas", "Chloé", "Kwame", "Sofia", "Lukas", "Amara", "Diego", "Nora", "Hugo", "Yuki", "Elena", "Tariq", "Ingrid", "Rafael", "Zoë", "Felix", "Imani", "Pablo", "Anouk", "Ravi", "Maya", "Stefan", "Leila", "Bruno", "Astrid"];
const LAST = ["Okafor", "Lindqvist", "Moreau", "Tanaka", "Silva", "Kowalski", "Haddad", "Fischer", "Rossi", "Mbeki", "Novak", "Dubois", "Sato", "Jensen", "Ortega", "Petrov", "Nguyen", "Barros", "Keller", "Adeyemi", "Laurent", "Costa", "Virtanen", "Ibrahim", "Marchetti"];

const COMMENTS = [
  "Backed on day one. Can't wait to see this come together!",
  "This is exactly the kind of project I come here for. Good luck!",
  "Will there be an option for international shipping at the lower tiers?",
  "Shared with my whole group chat. Let's get this funded.",
  "The updates so far have been wonderfully transparent. Thank you.",
  "Upgraded my pledge after reading the story section. Beautiful work.",
  "Is the timeline still on track? Either way, happy to wait for it to be done right.",
  "My first pledge on Crownfunding. Glad it's this one.",
];

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "project"
  );
}

function storyFor(p: SeedProject): string {
  return [
    `## The idea`,
    p.blurb,
    `We've spent the last year prototyping, testing and rebuilding until it felt right. Now we need your help to take it from a working prototype to something we can put in your hands.`,
    `## Where the money goes`,
    `Our goal of $${p.goal.toLocaleString("en-US")} covers the first production run, packaging, and fulfilment. Roughly 60% goes to manufacturing, 20% to shipping, 10% to fees, and 10% is held back as contingency.`,
    `## Timeline`,
    `- Campaign ends and funds are collected\n- Final files and tooling signed off\n- Production run\n- Quality checks, packing and shipping to backers`,
    `## Who we are`,
    `${p.creator} is based in ${p.location}. This is a project we would be making anyway — backing it simply lets us make it properly, and for more people.`,
  ].join("\n\n");
}

export function seed(db: DatabaseSync) {
  const rand = mulberry32(20261115);
  const now = Date.now();
  const noLogin = "!";

  const insUser = db.prepare(
    "INSERT INTO users (name, email, password_hash, bio, location, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  );
  insUser.run(
    "Demo Backer",
    DEMO_EMAIL,
    hashPassword(DEMO_PASSWORD),
    "The demo account. Sign in to pledge, comment, save and launch projects.",
    "Everywhere",
    now - 200 * DAY
  );

  // Synthetic community of backers (cannot sign in).
  const backerIds: number[] = [];
  for (let i = 0; i < 2400; i++) {
    const name = `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}`;
    const r = insUser.run(name, `backer${i}@seed.crownfunding.test`, noLogin, "", "", now - Math.floor(rand() * 700) * DAY);
    backerIds.push(Number(r.lastInsertRowid));
  }

  const insProject = db.prepare(
    `INSERT INTO projects (slug, creator_id, title, blurb, category, location, story, risks, goal, duration_days, status, featured, created_at, launched_at, deadline)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'live', ?, ?, ?, ?)`
  );
  const insReward = db.prepare(
    "INSERT INTO rewards (project_id, title, description, amount, delivery, limit_qty) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insPledge = db.prepare(
    "INSERT INTO pledges (project_id, user_id, reward_id, amount, created_at) VALUES (?, ?, ?, ?, ?)"
  );
  const insUpdate = db.prepare("INSERT INTO updates (project_id, title, body, created_at) VALUES (?, ?, ?, ?)");
  const insComment = db.prepare("INSERT INTO comments (project_id, user_id, body, created_at) VALUES (?, ?, ?, ?)");
  const insFaq = db.prepare("INSERT INTO faqs (project_id, question, answer) VALUES (?, ?, ?)");

  PROJECTS.forEach((p, idx) => {
    const creator = insUser.run(
      p.creator,
      `creator${idx}@seed.crownfunding.test`,
      noLogin,
      `Independent creator based in ${p.location}.`,
      p.location,
      now - (300 + idx * 7) * DAY
    );
    const creatorId = Number(creator.lastInsertRowid);
    const duration = 35;
    const deadline = now + p.daysLeft * DAY + Math.floor(rand() * 20) * 3_600_000 + 3_600_000;
    const launched = deadline - duration * DAY;
    const pr = insProject.run(
      slugify(p.title),
      creatorId,
      p.title,
      p.blurb,
      p.category,
      p.location,
      storyFor(p),
      "Every production run carries risk: supplier delays, shipping costs and the odd surprise. We've padded the schedule and budget, and we'll post an update the moment anything changes.",
      p.goal,
      duration,
      p.featured ? 1 : 0,
      launched - 10 * DAY,
      launched,
      deadline
    );
    const projectId = Number(pr.lastInsertRowid);

    const rewardIds = p.tiers.map(([title, amount], i) => {
      const top = i === p.tiers.length - 1;
      const r = insReward.run(
        projectId,
        title,
        top
          ? "Our most generous tier, limited in number. Includes everything in the tiers below, plus our endless gratitude."
          : "Includes a thank-you in the project credits and every backer update along the way.",
        amount,
        ["March 2027", "April 2027", "June 2027", "August 2027"][i % 4],
        top ? 25 : null
      );
      return Number(r.lastInsertRowid);
    });

    // Pledges: draw distinct backers until the target is reached.
    const target = Math.round(p.goal * p.ratio);
    const end = Math.min(now, deadline);
    const start = Math.floor(rand() * backerIds.length);
    let sum = 0;
    let topClaimed = 0;
    const projectBackers: number[] = [];
    for (let k = 0; k < backerIds.length && sum < target; k++) {
      const userId = backerIds[(start + k * 7) % backerIds.length];
      const roll = rand();
      let tier = roll < 0.18 ? 0 : roll < 0.68 ? 1 : roll < 0.97 ? 2 : 3;
      if (tier === 3 && topClaimed >= 20) tier = 2;
      if (tier === 3) topClaimed++;
      let amount = p.tiers[tier][1] + (rand() < 0.2 ? Math.ceil(rand() * 20) : 0);
      if (sum + amount > target && target - sum >= 1) amount = Math.max(1, target - sum);
      const rewardId = amount >= p.tiers[tier][1] ? rewardIds[tier] : null;
      insPledge.run(projectId, userId, rewardId, amount, launched + Math.floor(rand() * (end - launched)));
      projectBackers.push(userId);
      sum += amount;
    }

    insUpdate.run(projectId, "We're live — thank you!", `The campaign for ${p.title} is officially open. Thank you to everyone who backed in the first hours; it means more than we can say.\n\nWe'll post here at every milestone.`, launched + DAY);
    if (p.ratio >= 1) {
      insUpdate.run(projectId, "Funded! What happens next", "We crossed our goal. Everything from here goes into making the first run better: sturdier packaging, a longer print run, and a little breathing room in the schedule.", launched + Math.floor((end - launched) * 0.7));
    }
    const nComments = Math.min(projectBackers.length, 3 + Math.floor(rand() * 4));
    for (let c = 0; c < nComments; c++) {
      insComment.run(projectId, projectBackers[c], COMMENTS[(idx + c) % COMMENTS.length], launched + Math.floor(rand() * (end - launched)));
    }
    insFaq.run(projectId, "When will rewards ship?", "Each reward tier lists its own estimated delivery. We'll confirm exact dates in an update once production starts.");
    insFaq.run(projectId, "What happens if the project doesn't reach its goal?", "Funding on Crownfunding is all-or-nothing. If the goal isn't met by the deadline, no one is charged.");
    insFaq.run(projectId, "Do you ship internationally?", "Yes. Shipping is calculated after the campaign so we can charge the real cost and nothing more.");
  });
}
