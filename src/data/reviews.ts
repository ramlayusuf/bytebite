/*
 * SAMPLE reviews for the prototype — placeholder text, not real customer feedback.
 * Kept deliberately generic (no prices, ingredients or claims about the restaurants).
 * Replace with real data (e.g. from Careem's ratings API) before showing this to anyone as genuine.
 */
export type Review = { name: string; rating: number; text: string; when: string };

export const reviews: Record<string, Review[]> = {
  burger: [
    { name: "Layla M.", rating: 5, text: "Juicy, and it arrived still warm. Would order again.", when: "2 days ago" },
    { name: "Omar K.", rating: 4, text: "Rich and messy in the best way. Grab extra napkins.", when: "1 week ago" },
  ],
  shawarma: [
    { name: "Hamza A.", rating: 5, text: "Flavourful and filling. Delivery was quick.", when: "Yesterday" },
    { name: "Dana R.", rating: 4, text: "Generous portion, nicely seasoned.", when: "4 days ago" },
  ],
  sushi: [
    { name: "Mia L.", rating: 5, text: "Fresh and neatly packed. The pressed style is really filling.", when: "3 days ago" },
    { name: "Karim B.", rating: 4, text: "Great quality for delivery, a little pricey.", when: "1 week ago" },
  ],
  pasta: [
    { name: "Elena V.", rating: 4, text: "Rich and creamy. Better shared.", when: "2 days ago" },
    { name: "Rashid N.", rating: 4, text: "Tasty, though on the pricey side.", when: "5 days ago" },
  ],
  pizza: [
    { name: "Giulia P.", rating: 5, text: "Crisp edge and plenty of flavour.", when: "3 days ago" },
    { name: "Sam O.", rating: 4, text: "I order early so it arrives on time. Worth it.", when: "1 week ago" },
  ],
  biryani: [
    { name: "Imran Z.", rating: 5, text: "Big portion, full of flavour.", when: "2 days ago" },
    { name: "Fatima S.", rating: 4, text: "Well balanced spice, not just hot.", when: "5 days ago" },
  ],
  kunafa: [
    { name: "Noor A.", rating: 5, text: "Warm, stretchy cheese and a crisp top.", when: "Yesterday" },
    { name: "Hana K.", rating: 4, text: "Rich! One is plenty for two people.", when: "2 weeks ago" },
  ],
};
