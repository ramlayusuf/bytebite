import { FoodFeed } from "@/components/food-feed";
import { dishes } from "@/data/dishes";

export default function Home() {
  return (
    <main className="desktop-stage">
      <div className="desktop-inner">
        <div className="phone-column">
          <FoodFeed initialDishes={dishes} />
        </div>
      </div>
    </main>
  );
}
