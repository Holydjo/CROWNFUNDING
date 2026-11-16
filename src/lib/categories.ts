export type Category = { slug: string; name: string; emoji: string; hue: number };

export const CATEGORIES: Category[] = [
  { slug: "art", name: "Art", emoji: "🎨", hue: 340 },
  { slug: "comics", name: "Comics", emoji: "💥", hue: 18 },
  { slug: "crafts", name: "Crafts", emoji: "🧶", hue: 28 },
  { slug: "design", name: "Design", emoji: "📐", hue: 200 },
  { slug: "fashion", name: "Fashion", emoji: "🧥", hue: 300 },
  { slug: "film", name: "Film & Video", emoji: "🎬", hue: 0 },
  { slug: "food", name: "Food", emoji: "🍲", hue: 40 },
  { slug: "games", name: "Games", emoji: "🎲", hue: 265 },
  { slug: "music", name: "Music", emoji: "🎵", hue: 170 },
  { slug: "publishing", name: "Publishing", emoji: "📚", hue: 150 },
  { slug: "technology", name: "Technology", emoji: "🛰️", hue: 220 },
  { slug: "theater", name: "Theater", emoji: "🎭", hue: 320 },
];

export function categoryBySlug(slug: string): Category {
  return CATEGORIES.find((c) => c.slug === slug) ?? CATEGORIES[0];
}

export function isCategory(slug: string): boolean {
  return CATEGORIES.some((c) => c.slug === slug);
}
