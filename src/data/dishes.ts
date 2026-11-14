import type { Dish } from "@/types/dish";

/*
 * Every dish below is backed by a real, public TikTok video (played through TikTok's embed player).
 * `creatorHandle` is the account that posted it; `restaurantHandle` is the restaurant's own account.
 * Where a price appears in the video's caption it is used as-is; the two marked "carried over" are
 * placeholders from the earlier prototype and are not from the video.
 * Dishes added later have no stock photo (imageUrl) on purpose: a generic picture would be wrong.
 * The last seven (priceKnown: false) were added from links only: their dish names and prices are not
 * known yet, so the UI says "Price at checkout" rather than inventing numbers.
 * Ratings, review counts and delivery times are deliberately NOT set — no verified source for them.
 */
export const dishes: Dish[] = [
  {
    id: "burger", name: "Bull Burger", restaurant: "Eleven Green", cuisine: "Burgers", price: 61,
    description: "The award-winning burger from Eleven Green at Meyan Mall, Jumeirah. Sells out most days.",
    items: [{ name: "Bull Burger", price: 61 }, { name: "Idaho Potato Fries", price: 25 }, { name: "Fudge a-la-Mode", price: 39 }],
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
    items: [{ name: "White Truffle Pasta with Shrimp", price: 105 }, { name: "Street Fries", price: 40 }, { name: "Crispy Chicken Potato Slider", price: 23 }, { name: "Thyme Pomegranate (drink)", price: 31 }],
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
    items: [{ name: "Classic Murgh Badami Tang / Kabab Biryani", price: 52 }, { name: "Aatishe Jhinga Biryani", price: 84 }, { name: "Murgh Seekh Bharwan", price: 41 }, { name: "Paneer Makhni", price: 33 }, { name: "Butter Naan", price: 9 }],
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
  {
    id: "udon", name: "Paitan Chicken", restaurant: "Maru Udon", cuisine: "Japanese", price: 59,
    description: "A weekly-craving favourite for udon noodles, with consistently good quality. In Business Bay, Al Ghurair Centre and Motor City.",
    tags: ["Local favourite"], ingredients: ["Udon noodles", "Chicken"], gridPosition: "0% 0%", match: 88,
    tiktokId: "7352048152070851841", creatorHandle: "thedubailist",
    reviewUrl: "https://www.tiktok.com/@thedubailist/video/7352048152070851841", reviewCreator: "thedubailist", reviewPlatform: "TikTok",
  },
  {
    id: "ethiopian", name: "Zagol Platter", restaurant: "Zagol, Al Karama", cuisine: "Other", price: 55,
    description: "Authentic Ethiopian: injera bread with 8 side dishes of chicken, beef and vegetables. Flavourful and filling.",
    tags: ["Ethiopian"], ingredients: ["Injera", "Chicken", "Beef", "Vegetables"], gridPosition: "0% 0%", match: 86,
    tiktokId: "7389278350092635410", creatorHandle: "thedubailist",
    reviewUrl: "https://www.tiktok.com/@thedubailist/video/7389278350092635410", reviewCreator: "thedubailist", reviewPlatform: "TikTok",
  },
  {
    id: "chinese", name: "Sweet & Sour Chicken", restaurant: "Han Cuisine", cuisine: "Asian", price: 65,
    description: "Called next level by the reviewer. Han Cuisine is in Spring Souk and Business Bay.",
    items: [{ name: "Sweet & Sour Chicken", price: 65 }, { name: "Stir Fried Beef", price: 65 }, { name: "Shrimp Dumplings", price: 20 }],
    tags: ["Chinese"], ingredients: ["Chicken", "Sweet and sour sauce"], gridPosition: "0% 0%", match: 84,
    tiktokId: "7495727608810786055", creatorHandle: "thedubailist",
    reviewUrl: "https://www.tiktok.com/@thedubailist/video/7495727608810786055", reviewCreator: "thedubailist", reviewPlatform: "TikTok",
  },
  {
    id: "saj", name: "Shawarma Saj", restaurant: "Shawarma Jeddo", cuisine: "Arabic", price: 18,
    description: "Beirut family recipes in Silicon Oasis. Sojouk, beef or Mexican chicken shawarma on saj, all AED 18.",
    items: [{ name: "Sojouk Shawarma Saj", price: 18 }, { name: "Beef Shawarma Saj", price: 18 }, { name: "Mexican Chicken Shawarma Saj", price: 18 }],
    tags: ["Beirut recipes"], ingredients: ["Saj bread", "Sojouk", "Beef", "Mexican chicken"], gridPosition: "0% 0%", match: 83,
    tiktokId: "7323847426744274177", creatorHandle: "feedkiani",
    reviewUrl: "https://www.tiktok.com/@feedkiani/video/7323847426744274177", reviewCreator: "feedkiani", reviewPlatform: "TikTok",
  },
  {
    id: "truffle-pizza", name: "Truffle Pizza", restaurant: "Moon Slice, Dar Wasl Mall", cuisine: "Italian", price: 125,
    description: "Very saucy and creamy. One reviewer called it one of the best truffle pizzas in Dubai, and a little pricey.",
    tags: ["Truffle"], ingredients: ["Truffle", "Creamy sauce"], gridPosition: "0% 0%", match: 80,
    tiktokId: "7414925737720909073", creatorHandle: "misszuzucchini",
    reviewUrl: "https://www.tiktok.com/@misszuzucchini/video/7414925737720909073", reviewCreator: "misszuzucchini", reviewPlatform: "TikTok",
  },
  {
    id: "shawarma-pizza", name: "Chicken Shawarma Pizza", restaurant: "Abu Zouz, Jumeirah", cuisine: "Arabic", price: 35,
    description: "From a Syrian shawarma restaurant in Jumeirah Centre. Dine in and a bowl of lentil soup is on the house.",
    items: [{ name: "Chicken Shawarma Pizza", price: 35 }, { name: "Shawarma Chicken", price: 15 }, { name: "Shawarma Beef", price: 22 }, { name: "Shawarma Mexican", price: 15 }, { name: "Manakish Za'atar", price: 10 }],
    tags: ["Syrian"], ingredients: ["Chicken shawarma", "Pizza"], gridPosition: "0% 0%", match: 79,
    tiktokId: "7406582262742994183", creatorHandle: "feedkiani",
    reviewUrl: "https://www.tiktok.com/@feedkiani/video/7406582262742994183", reviewCreator: "feedkiani", reviewPlatform: "TikTok",
  },
  {
    id: "ramen", name: "Tomo Ramen", restaurant: "Tomo, Raffles Hotel", cuisine: "Japanese", price: 90,
    description: "Picked as the best of 15+ bowls around Dubai: creamy, balanced by salty dashi and a touch of spice. Around AED 90 a bowl.",
    tags: ["Award-winning"], ingredients: ["Ramen", "Dashi"], gridPosition: "0% 0%", match: 81,
    tiktokId: "7242373006255754542", creatorHandle: "justfooddxb",
    reviewUrl: "https://www.tiktok.com/@justfooddxb/video/7242373006255754542", reviewCreator: "justfooddxb", reviewPlatform: "TikTok",
  },
  {
    id: "satay", name: "Sate Ayam", restaurant: "Dapoer Kita, Karama", cuisine: "Asian", price: 28,
    description: "Chicken satay with peanut sauce at an Indonesian restaurant in Al Karama.",
    items: [{ name: "Sate Ayam", price: 28 }, { name: "Paket Nasi Uduk", price: 32 }, { name: "Mie Goreng Ayam", price: 29 }, { name: "Ayam Penyet", price: 20 }, { name: "Daging Rendang", price: 15 }],
    tags: ["Indonesian"], ingredients: ["Chicken satay", "Peanut sauce"], gridPosition: "0% 0%", match: 78,
    tiktokId: "7368800642241973525", creatorHandle: "feedkiani",
    reviewUrl: "https://www.tiktok.com/@feedkiani/video/7368800642241973525", reviewCreator: "feedkiani", reviewPlatform: "TikTok",
  },
  {
    id: "papajohns", name: "Featured on Papa Johns UAE", restaurant: "Papa Johns UAE", cuisine: "Italian", price: 0, priceKnown: false,
    description: "Posted by the restaurant on TikTok. Watch the video, then add it to your bag. The dish and its price are confirmed at checkout.",
    tags: ["From the restaurant"], gridPosition: "0% 0%", match: 76,
    tiktokId: "7638294839993355528", creatorHandle: "papajohnsuae", restaurantHandle: "papajohnsuae",
    reviewUrl: "https://www.tiktok.com/@papajohnsuae/video/7638294839993355528", reviewCreator: "papajohnsuae", reviewPlatform: "TikTok",
  },
  {
    id: "amroeats", name: "Featured in Amro Eats' video", restaurant: "Restaurant in the video", cuisine: "Other", price: 0, priceKnown: false,
    description: "Watch the video, then add it to your bag. The dish and its price are confirmed at checkout.",
    tags: ["Creator pick"], gridPosition: "0% 0%", match: 76,
    tiktokId: "7625708081934093588", creatorHandle: "amroeats",
    reviewUrl: "https://www.tiktok.com/@amroeats/video/7625708081934093588", reviewCreator: "amroeats", reviewPlatform: "TikTok",
  },
  {
    id: "hardees", name: "Featured on Hardee's UAE", restaurant: "Hardee's UAE", cuisine: "Burgers", price: 0, priceKnown: false,
    description: "Posted by the restaurant on TikTok. Watch the video, then add it to your bag. The dish and its price are confirmed at checkout.",
    tags: ["From the restaurant"], gridPosition: "0% 0%", match: 76,
    tiktokId: "7678845319278333205", creatorHandle: "hardees.uae", restaurantHandle: "hardees.uae",
    reviewUrl: "https://www.tiktok.com/@hardees.uae/video/7678845319278333205", reviewCreator: "hardees.uae", reviewPlatform: "TikTok",
  },
  {
    id: "bweebites", name: "Featured in bweebites' video", restaurant: "Restaurant in the video", cuisine: "Other", price: 0, priceKnown: false,
    description: "Watch the video, then add it to your bag. The dish and its price are confirmed at checkout.",
    tags: ["Creator pick"], gridPosition: "0% 0%", match: 76,
    tiktokId: "7621119789188107541", creatorHandle: "bweebites",
    reviewUrl: "https://www.tiktok.com/@bweebites/video/7621119789188107541", reviewCreator: "bweebites", reviewPlatform: "TikTok",
  },
  {
    id: "hungrydentist", name: "Featured in The Hungry Dentist's video", restaurant: "Restaurant in the video", cuisine: "Other", price: 0, priceKnown: false,
    description: "Watch the video, then add it to your bag. The dish and its price are confirmed at checkout.",
    tags: ["Creator pick"], gridPosition: "0% 0%", match: 76,
    tiktokId: "7700236442835995924", creatorHandle: "thehungrydentist",
    reviewUrl: "https://www.tiktok.com/@thehungrydentist/video/7700236442835995924", reviewCreator: "thehungrydentist", reviewPlatform: "TikTok",
  },
  {
    id: "laffah", name: "Featured on Laffah", restaurant: "Laffah", cuisine: "Arabic", price: 0, priceKnown: false,
    description: "Posted by the restaurant on TikTok. Watch the video, then add it to your bag. The dish and its price are confirmed at checkout.",
    tags: ["From the restaurant"], gridPosition: "0% 0%", match: 76,
    tiktokId: "7575551939967028501", creatorHandle: "laffahrestuae", restaurantHandle: "laffahrestuae",
    reviewUrl: "https://www.tiktok.com/@laffahrestuae/video/7575551939967028501", reviewCreator: "laffahrestuae", reviewPlatform: "TikTok",
  },
  {
    id: "pizzaro", name: "Featured on Pizzaro", restaurant: "Pizzaro", cuisine: "Italian", price: 0, priceKnown: false,
    description: "Posted by the restaurant on TikTok. Watch the video, then add it to your bag. The dish and its price are confirmed at checkout.",
    tags: ["From the restaurant"], gridPosition: "0% 0%", match: 76,
    tiktokId: "7521727990955314450", creatorHandle: "pizzaro.me", restaurantHandle: "pizzaro.me",
    reviewUrl: "https://www.tiktok.com/@pizzaro.me/video/7521727990955314450", reviewCreator: "pizzaro.me", reviewPlatform: "TikTok",
  },
];
