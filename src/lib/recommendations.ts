import type { Cuisine, Dish } from "@/types/dish";

export type TasteProfile = {
  cuisineAffinity: Partial<Record<Cuisine, number>>;
  dwellMs: Record<string, number>;
  liked: string[];
  saved: string[];
  skipped: string[];
  basketAdds: string[];
  priceSamples: number[];
  spendByCuisine: Partial<Record<Cuisine, number[]>>;
};

export type TasteSignal = "like" | "unlike" | "save" | "unsave" | "skip" | "basket" | "dwell";

export const emptyTasteProfile = (): TasteProfile => ({
  cuisineAffinity: {},
  dwellMs: {},
  liked: [],
  saved: [],
  skipped: [],
  basketAdds: [],
  priceSamples: [],
  spendByCuisine: { Arabic: [34, 39, 42], Japanese: [52, 61], Italian: [48, 55] },
});

const uniqueAdd = (items: string[], id: string) => items.includes(id) ? items : [...items, id];
const remove = (items: string[], id: string) => items.filter(item => item !== id);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function applyTasteSignal(profile: TasteProfile, dish: Dish, signal: TasteSignal, value = 0): TasteProfile {
  const next: TasteProfile = {
    ...profile,
    cuisineAffinity: { ...profile.cuisineAffinity },
    dwellMs: { ...profile.dwellMs },
    liked: [...profile.liked],
    saved: [...profile.saved],
    skipped: [...profile.skipped],
    basketAdds: [...profile.basketAdds],
    priceSamples: [...profile.priceSamples],
    spendByCuisine: Object.fromEntries(Object.entries(profile.spendByCuisine ?? {}).map(([key, values]) => [key, [...values]])),
  };
  const affinity = next.cuisineAffinity[dish.cuisine] ?? 0;

  if (signal === "like") {
    next.liked = uniqueAdd(next.liked, dish.id);
    next.skipped = remove(next.skipped, dish.id);
    next.cuisineAffinity[dish.cuisine] = clamp(affinity + 3, -8, 12);
  } else if (signal === "unlike") {
    next.liked = remove(next.liked, dish.id);
    next.cuisineAffinity[dish.cuisine] = clamp(affinity - 3, -8, 12);
  } else if (signal === "save") {
    next.saved = uniqueAdd(next.saved, dish.id);
    next.cuisineAffinity[dish.cuisine] = clamp(affinity + 2, -8, 12);
  } else if (signal === "unsave") {
    next.saved = remove(next.saved, dish.id);
    next.cuisineAffinity[dish.cuisine] = clamp(affinity - 2, -8, 12);
  } else if (signal === "skip") {
    next.skipped = uniqueAdd(next.skipped, dish.id);
    next.cuisineAffinity[dish.cuisine] = clamp(affinity - 2, -8, 12);
  } else if (signal === "basket") {
    next.basketAdds = uniqueAdd(next.basketAdds, dish.id);
    next.priceSamples = [...next.priceSamples.slice(-7), dish.price];
    next.spendByCuisine[dish.cuisine] = [...(next.spendByCuisine[dish.cuisine] ?? []).slice(-5), dish.price];
    next.cuisineAffinity[dish.cuisine] = clamp(affinity + 4, -8, 12);
  } else if (signal === "dwell") {
    next.dwellMs[dish.id] = Math.min(30_000, (next.dwellMs[dish.id] ?? 0) + value);
    if (value >= 5_000) next.cuisineAffinity[dish.cuisine] = clamp(affinity + 1, -8, 12);
  }
  return next;
}

export function tasteScore(dish: Dish, profile: TasteProfile) {
  const affinity = profile.cuisineAffinity[dish.cuisine] ?? 0;
  const cuisineSpend = profile.spendByCuisine?.[dish.cuisine] ?? [];
  const samples = cuisineSpend.length ? cuisineSpend : profile.priceSamples;
  const averagePrice = samples.length
    ? samples.reduce((sum, price) => sum + price, 0) / samples.length
    : 48;
  const priceFit = clamp(8 - Math.abs(dish.price - averagePrice) / 4, 0, 8);
  const dwell = profile.dwellMs[dish.id] ?? 0;
  const dwellSignal = dwell >= 10_000 ? 7 : dwell >= 5_000 ? 5 : dwell >= 2_500 ? 2 : 0;
  const explicit = (profile.liked.includes(dish.id) ? 12 : 0)
    + (profile.saved.includes(dish.id) ? 7 : 0)
    + (profile.basketAdds.includes(dish.id) ? 10 : 0)
    - (profile.skipped.includes(dish.id) ? 14 : 0);
  const quality = ((dish.rating ?? 4.5) - 4.5) * 10;
  const deliveryFit = clamp((35 - (dish.deliveryMinutes ?? 30)) / 4, 0, 4);
  const score = Math.round(62 + affinity * 2 + priceFit + dwellSignal + explicit + quality + deliveryFit);
  return clamp(score, 35, 99);
}

export function tasteReason(dish: Dish, profile: TasteProfile) {
  if (profile.basketAdds.includes(dish.id)) return "You added this dish · strong signal";
  if (profile.liked.includes(dish.id)) return `You loved this · more ${dish.cuisine}`;
  if (profile.saved.includes(dish.id)) return "Saved dishes get a ranking boost";
  const affinity = profile.cuisineAffinity[dish.cuisine] ?? 0;
  if (affinity >= 3) return `${dish.cuisine} is trending in your taste profile`;
  if ((profile.dwellMs[dish.id] ?? 0) >= 5_000) return "You spent time looking at this dish";
  if ((profile.spendByCuisine?.[dish.cuisine]?.length ?? 0) > 0) return `Fits what you usually spend on ${dish.cuisine}`;
  if (profile.priceSamples.length) return "Matches your recent basket budget";
  return "Starting estimate from price, rating and delivery time";
}

export function rankDishes(dishes: Dish[], profile: TasteProfile) {
  return [...dishes].sort((a, b) => tasteScore(b, profile) - tasteScore(a, profile));
}
