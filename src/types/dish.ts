export type Cuisine = "Burgers" | "Arabic" | "Japanese" | "Italian" | "Asian" | "Indian" | "Dessert" | "Other";

export type Dish = {
  id: string;
  name: string;
  restaurant: string;
  cuisine: Cuisine;
  price: number;
  /* false when the price isn't known yet: the UI says "Price at checkout" instead of showing AED 0 */
  priceKnown?: boolean;
  /* Not every source has these, so they are optional and the UI hides them when missing. */
  rating?: number;
  reviews?: string;
  deliveryMinutes?: number;
  description: string;
  tags: string[];
  ingredients?: string[];
  /* every dish shown in the video, when there is more than one (the first matches name/price) */
  items?: { name: string; price: number }[];
  gridPosition: string;
  match: number;
  imageUrl?: string;
  /* a native video file (uploads) */
  videoUrl?: string;
  /* a TikTok post id, played with TikTok's official embed player */
  tiktokId?: string;
  /* the TikTok account that posted the video, and the restaurant's own account if different */
  creatorHandle?: string;
  restaurantHandle?: string;
  reviewUrl?: string;
  reviewCreator?: string;
  reviewPlatform?: "YouTube" | "Instagram" | "TikTok";
  merchantId?: number;
  /* set on dishes uploaded through the app */
  uploadId?: string;
  uploadedBy?: "restaurant" | "customer";
};
