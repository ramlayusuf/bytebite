export type Cuisine = "Burgers" | "Arabic" | "Japanese" | "Italian" | "Asian" | "Indian" | "Dessert";

export type Dish = {
  id: string;
  name: string;
  restaurant: string;
  cuisine: Cuisine;
  price: number;
  rating: number;
  reviews: string;
  deliveryMinutes: number;
  description: string;
  tags: string[];
  gridPosition: string;
  match: number;
  imageUrl?: string;
  videoUrl?: string;
  embedUrl?: string;
  reviewUrl?: string;
  reviewCreator?: string;
  reviewPlatform?: "YouTube" | "Instagram" | "TikTok";
  merchantId?: number;
};
