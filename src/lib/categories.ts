/** Display names are translated in ./i18n (t.category). */
export type Category = { slug: string; emoji: string; hue: number };

export const CATEGORIES: Category[] = [
  { slug: "art", emoji: "🎨", hue: 340 },
  { slug: "comics", emoji: "💥", hue: 18 },
  { slug: "crafts", emoji: "🧶", hue: 28 },
  { slug: "design", emoji: "📐", hue: 200 },
  { slug: "fashion", emoji: "🧥", hue: 300 },
  { slug: "film", emoji: "🎬", hue: 0 },
  { slug: "food", emoji: "🍲", hue: 40 },
  { slug: "games", emoji: "🎲", hue: 265 },
  { slug: "music", emoji: "🎵", hue: 170 },
  { slug: "publishing", emoji: "📚", hue: 150 },
  { slug: "technology", emoji: "🛰️", hue: 220 },
  { slug: "theater", emoji: "🎭", hue: 320 },
];

export function categoryBySlug(slug: string): Category {
  return CATEGORIES.find((c) => c.slug === slug) ?? CATEGORIES[0];
}

export function isCategory(slug: string): boolean {
  return CATEGORIES.some((c) => c.slug === slug);
}
