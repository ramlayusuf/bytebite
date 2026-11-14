import type { Dish } from "@/types/dish";

/*
 * Every dish below is backed by a real, public TikTok video (played through TikTok's embed player).
 * `creatorHandle` is the account that posted it; `restaurantHandle` is the restaurant's own account.
 * Where a price appears in the video's caption it is used as-is; the two marked "carried over" are
 * placeholders from the earlier prototype and are not from the video.
 * Ratings, review counts and delivery times are deliberately NOT set — no verified source for them.
 */
export const dishes: Dish[] = [
  {
    id: "burger", name: "Bull Burger", restaurant: "Eleven Green", cuisine: "Burgers", price: 61,
    description: "The award-winning burger from Eleven Green at Meyan Mall, Jumeirah. Sells out most days.",
    tags: ["Award winner"], ingredients: ["Beef patty", "Cheese", "Signature sauce"], gridPosition: "0% 0%",
    imageUrl: "/food/dishes/burger.jpg", match: 96,
    tiktokId: "7417809228460477704", creatorHandle: "thedubailist", restaurantHandle: "elevengreen.uae",
    reviewUrl: "https://www.tiktok.com/@thedubailist/video/7417809228460477704", reviewCreator: "thedubailist", reviewPlatform: "TikTok",
  },
  {
    id: "shawarma", name: "Shawarma", restaurant: "Allo Beirut", cuisine: "Arabic", price: 38, /* price carried over */
    description: "Lebanese street-food shawarma straight from Allo Beirut's own kitchen in Dubai.",
    tags: ["From the restaurant"], ingredients: ["Shawarma", "Lebanese street food"], gridPosition: "33.333% 0%",
    imageUrl: "/food/dishes/shawarma.jpg", match: 93,
    tiktokId: "7020360146182262018", creatorHandle: "allobeirutstreetfood", restaurantHandle: "allobeirutstreetfood",
    reviewUrl: "https://www.tiktok.com/@allobeirutstreetfood/video/7020360146182262018", reviewCreator: "allobeirutstreetfood", reviewPlatform: "TikTok",
  },
  {
    id: "sushi", name: "Oshi Pressed Sushi", restaurant: "Soy Fish", cuisine: "Japanese", price: 45,
    description: "Pressed sushi (oshi), AED 45–60 each. Seared salmon and wagyu are the favourites. Delivery only, on Careem.",
    tags: ["On Careem"], ingredients: ["Seared salmon", "Wagyu", "Spicy tuna"], gridPosition: "66.666% 0%",
    imageUrl: "/food/dishes/sushi.jpg", match: 91,
    tiktokId: "7347354701806980382", creatorHandle: "justfooddxb", restaurantHandle: "soyfishdxb",
    reviewUrl: "https://www.tiktok.com/@justfooddxb/video/7347354701806980382", reviewCreator: "justfooddxb", reviewPlatform: "TikTok",
  },
  {
    id: "pasta", name: "White Truffle Pasta with Shrimp", restaurant: "Parker's, Dubai Mall", cuisine: "Italian", price: 105,
    description: "A French-with-a-twist take on truffle pasta at Parker's in The Dubai Mall.",
    tags: ["Dubai Mall"], ingredients: ["White truffle", "Pasta", "Shrimp"], gridPosition: "100% 0%",
    imageUrl: "/food/dishes/pasta.jpg", match: 89,
    tiktokId: "7304678365758246176", creatorHandle: "unkleeats",
    reviewUrl: "https://www.tiktok.com/@unkleeats/video/7304678365758246176", reviewCreator: "unkleeats", reviewPlatform: "TikTok",
  },
  {
    id: "pizza", name: "Pitfire Pizza", restaurant: "Pitfire Pizza", cuisine: "Italian", price: 60, /* price carried over */
    description: "Straight from Pitfire's own kitchen: pizza made to order, delivered across Dubai.",
    tags: ["From the restaurant"], gridPosition: "33.333% 100%",
    imageUrl: "/food/dishes/pizza.jpg", match: 85,
    tiktokId: "7288656076919164168", creatorHandle: "pitfirepizzabakers", restaurantHandle: "pitfirepizzabakers",
    reviewUrl: "https://www.tiktok.com/@pitfirepizzabakers/video/7288656076919164168", reviewCreator: "pitfirepizzabakers", reviewPlatform: "TikTok",
  },
  {
    id: "biryani", name: "Classic Murgh Badami Tang / Kabab Biryani", restaurant: "Gazebo", cuisine: "Indian", price: 52,
    description: "Gazebo's chicken biryani, from one of Dubai's longest-running Indian restaurants.",
    tags: ["Dubai classic"], ingredients: ["Chicken", "Kabab", "Rice"], gridPosition: "66.666% 100%",
    imageUrl: "/food/dishes/biryani.jpg", match: 82,
    tiktokId: "7297128792785554689", creatorHandle: "feedkiani", restaurantHandle: "gazeborestaurant",
    reviewUrl: "https://www.tiktok.com/@feedkiani/video/7297128792785554689", reviewCreator: "feedkiani", reviewPlatform: "TikTok",
  },
  {
    id: "kunafa", name: "Charcoal Knafeh Na'ameh", restaurant: "Omar Odali, Keturah Reserve", cuisine: "Dessert", price: 30,
    description: "Palestinian-owned. Knafeh cooked directly on charcoal for a caramelised crust and a proper cheese pull.",
    tags: ["Palestinian-owned"], ingredients: ["Kunafa", "Cheese"], gridPosition: "100% 100%",
    imageUrl: "/food/dishes/kunafa.jpg", match: 79,
    tiktokId: "7345019323762609426", creatorHandle: "tableeforone",
    reviewUrl: "https://www.tiktok.com/@tableeforone/video/7345019323762609426", reviewCreator: "tableeforone", reviewPlatform: "TikTok",
  },
];
