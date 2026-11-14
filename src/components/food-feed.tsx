"use client";
/* eslint-disable @next/next/no-img-element -- feed media arrives from runtime Careem MCP responses and user uploads. */

import { useEffect, useMemo, useRef, useState } from "react";
import type { Dish } from "@/types/dish";
import {
  applyTasteSignal,
  emptyTasteProfile,
  rankDishes,
  tasteReason,
  tasteScore,
  type TasteProfile,
  type TasteSignal,
} from "@/lib/recommendations";

type IconName =
  | "heart"
  | "bookmark"
  | "share"
  | "bag"
  | "close"
  | "spark"
  | "camera"
  | "users"
  | "home"
  | "chat"
  | "card"
  | "send";
type Panel = "basket" | "camera" | "room" | "chat" | "profile" | null;

function Icon({
  name,
  filled = false,
  size = 24,
}: {
  name: IconName;
  filled?: boolean;
  size?: number;
}) {
  const paths: Record<IconName, React.ReactNode> = {
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.8-7.7 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    ),
    bookmark: <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />,
    share: (
      <>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
      </>
    ),
    bag: (
      <>
        <path d="M5 8h14l-1 13H6L5 8Z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    spark: (
      <path d="m12 2 1.6 5.1L19 9l-5.4 1.9L12 16l-1.6-5.1L5 9l5.4-1.9L12 2Zm7 13 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
    ),
    camera: (
      <>
        <rect x="3" y="6" width="18" height="14" rx="2" />
        <path d="m8 6 1.5-2h5L16 6" />
        <circle cx="12" cy="13" r="4" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v11h14V10M9 21v-7h6v7" />
      </>
    ),
    chat: (
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
    ),
    card: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </>
    ),
    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
function Action({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: IconName;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={`group flex flex-col items-center gap-1 text-[11px] font-semibold ${active ? "text-[#2de3a1]" : "text-white"}`}
    >
      <span
        className={`grid h-12 w-12 place-items-center rounded-full border backdrop-blur-md transition active:scale-90 ${active ? "border-[#2de3a1]/70 bg-[#2de3a1]/20" : "border-white/20 bg-black/35 group-hover:bg-white/20"}`}
      >
        <Icon name={icon} filled={active} />
      </span>
      {label}
    </button>
  );
}
function Media({ dish }: { dish: Dish }) {
  if (dish.embedUrl)
    return (
      <>
        <img
          src={dish.imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <iframe
          src={dish.embedUrl}
          title={`${dish.restaurant} review by ${dish.reviewCreator}`}
          allow="autoplay; encrypted-media; picture-in-picture"
          className="review-embed absolute inset-0 h-full w-full border-0"
        />
      </>
    );
  if (dish.videoUrl)
    return (
      <video
        src={dish.videoUrl}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  if (dish.imageUrl)
    return (
      <img
        src={dish.imageUrl}
        alt=""
        className="food-clip absolute inset-0 h-full w-full object-cover"
      />
    );
  return (
    <div
      role="img"
      aria-label={dish.name}
      className="dish-photo absolute inset-0"
      style={{ backgroundPosition: dish.gridPosition }}
    />
  );
}

function TogetherPanel({
  baseDish,
  onCreateCart,
}: {
  baseDish: Dish;
  onCreateCart: (items: Dish[]) => void;
}) {
  const [room, setRoom] = useState(false);
  const [card, setCard] = useState(0);
  const [matched, setMatched] = useState(false);
  const [motion, setMotion] = useState<"yes" | "no" | null>(null);
  const [dragX, setDragX] = useState(0);
  const dragStart = useRef<number | null>(null);
  const choices: Dish[] = [
    baseDish,
    {
      ...baseDish,
      id: "group-burger-reem",
      name: "Spicy Jam Burger",
      price: 62,
    },
    {
      ...baseDish,
      id: "group-burger-mohammed",
      name: "Double Bull Burger",
      price: 74,
    },
  ];
  const vote = (yes: boolean) => {
    setMotion(yes ? "yes" : "no");
    setTimeout(() => {
      setMotion(null);
      if (yes) setMatched(true);
      else setCard((card + 1) % choices.length);
    }, 260);
  };
  const releaseCard = () => {
    if (dragStart.current === null) return;
    dragStart.current = null;
    if (Math.abs(dragX) >= 70) vote(dragX > 0);
    setDragX(0);
  };

  if (!room)
    return (
      <div>
        <div className="mb-4 flex -space-x-2">
          <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#102019] bg-[#5844d8] font-black">
            R
          </span>
          <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#102019] bg-[#ef755b] font-black">
            M
          </span>
          <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#102019] bg-white/10 text-white/40">
            +3
          </span>
        </div>
        <p className="mb-5 text-sm leading-6 text-white/60">
          Everyone swipes privately. A match happens when the group chooses
          dishes from the same restaurant.
        </p>
        <button
          onClick={() => setRoom(true)}
          className="w-full rounded-xl bg-[#2de3a1] py-3 font-black text-[#07110d]"
        >
          Create room · BYTE42
        </button>
      </div>
    );

  if (matched)
    return (
      <div>
        <div className="text-center">
          <p className="text-xs font-bold text-[#2de3a1]">RESTAURANT MATCH</p>
          <h3 className="mt-1 text-2xl font-black">
            Everyone chose Eleven Green
          </h3>
          <p className="mt-2 text-sm text-white/55">
            One restaurant, three dishes, one shared delivery.
          </p>
        </div>
        <div className="mt-4 space-y-2">
          {choices.map((dish, index) => (
            <div
              key={dish.id}
              className="flex items-center gap-3 rounded-xl bg-white/5 p-2"
            >
              <img
                src={dish.imageUrl}
                alt=""
                className="h-12 w-12 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{dish.name}</p>
                <p className="text-xs text-white/45">
                  {["You", "Reem", "Mohammed"][index]} · AED {dish.price}
                </p>
              </div>
              <span className="text-[#2de3a1]">✓</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => onCreateCart(choices)}
          className="mt-5 w-full rounded-xl bg-[#2de3a1] py-3 font-black text-[#07110d]"
        >
          Create shared cart · AED{" "}
          {choices.reduce((sum, dish) => sum + dish.price, 0)}
        </button>
      </div>
    );

  const dish = choices[card];
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="font-bold text-[#2de3a1]">ROOM BYTE42</span>
        <span className="text-white/45">
          {card + 1} of {choices.length}
        </span>
      </div>
      <div
        onPointerDown={(event) => {
          dragStart.current = event.clientX;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (dragStart.current !== null)
            setDragX(event.clientX - dragStart.current);
        }}
        onPointerUp={releaseCard}
        onPointerCancel={releaseCard}
        style={
          motion
            ? undefined
            : { transform: `translateX(${dragX}px) rotate(${dragX / 18}deg)` }
        }
        className={`relative touch-none cursor-grab overflow-hidden rounded-[24px] bg-white/5 transition duration-300 active:cursor-grabbing ${motion === "yes" ? "translate-x-full rotate-12 opacity-0" : motion === "no" ? "-translate-x-full -rotate-12 opacity-0" : ""}`}
      >
        <img
          src={dish.imageUrl}
          alt={dish.name}
          className="h-72 w-full select-none object-cover"
          draggable={false}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent p-5 pt-20">
          <p className="text-xs font-bold text-[#2de3a1]">{dish.restaurant}</p>
          <h3 className="text-2xl font-black">{dish.name}</h3>
          <p className="mt-1 text-sm text-white/65">
            AED {dish.price} · {dish.deliveryMinutes} min
          </p>
        </div>
        {(motion || Math.abs(dragX) > 35) && (
          <span
            className={`absolute top-5 rounded-lg border-4 px-3 py-1 text-2xl font-black ${motion === "yes" || (!motion && dragX > 0) ? "left-5 -rotate-12 border-[#2de3a1] text-[#2de3a1]" : "right-5 rotate-12 border-red-400 text-red-400"}`}
          >
            {motion === "yes" || (!motion && dragX > 0) ? "YES" : "NOPE"}
          </span>
        )}
      </div>
      <div className="mt-5 flex justify-center gap-6">
        <button
          onClick={() => vote(false)}
          aria-label="No"
          className="grid h-16 w-16 place-items-center rounded-full border border-red-400/40 bg-red-400/10 text-red-300"
        >
          <Icon name="close" size={28} />
        </button>
        <button
          onClick={() => vote(true)}
          aria-label="Yes"
          className="grid h-16 w-16 place-items-center rounded-full bg-[#2de3a1] text-[#07110d]"
        >
          <Icon name="heart" filled size={28} />
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-white/40">
        Swipe privately · friends cannot see your votes
      </p>
    </div>
  );
}

type SplitChoice = "equal" | "dish";

function SplitVote({
  basket,
  total,
  onComplete,
}: {
  basket: Dish[];
  total: number;
  onComplete: () => void;
}) {
  const members = ["You", "Reem", "Mohammed"];
  const [votes, setVotes] = useState<Record<string, SplitChoice | null>>({
    You: null,
    Reem: "equal",
    Mohammed: "dish",
  });
  const equalVotes = Object.values(votes).filter(
    (vote) => vote === "equal",
  ).length;
  const dishVotes = Object.values(votes).filter(
    (vote) => vote === "dish",
  ).length;
  const unanimous: SplitChoice | null =
    equalVotes === 3 ? "equal" : dishVotes === 3 ? "dish" : null;
  const castVote = (choice: SplitChoice) => {
    setVotes((current) => ({ ...current, You: choice }));
    setTimeout(
      () => setVotes((current) => ({ ...current, Reem: choice })),
      700,
    );
    setTimeout(
      () => setVotes((current) => ({ ...current, Mohammed: choice })),
      1400,
    );
  };

  return (
    <div className="pop mt-4 rounded-2xl bg-white p-4 text-[#07110d]">
      <p className="text-xs font-bold text-[#087f5b]">GROUP VOTE</p>
      <h3 className="mt-1 text-lg font-black">How should we split it?</h3>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => castVote("equal")}
          className={`rounded-xl border p-3 text-left ${votes.You === "equal" ? "border-[#087f5b] bg-[#e6fff5]" : "border-black/10"}`}
        >
          <strong className="block text-sm">Split equally</strong>
          <span className="text-xs text-black/50">
            AED {(total / 3).toFixed(2)} each
          </span>
          <span className="mt-2 block text-xs font-black text-[#087f5b]">
            {equalVotes} vote{equalVotes === 1 ? "" : "s"}
          </span>
        </button>
        <button
          onClick={() => castVote("dish")}
          className={`rounded-xl border p-3 text-left ${votes.You === "dish" ? "border-[#087f5b] bg-[#e6fff5]" : "border-black/10"}`}
        >
          <strong className="block text-sm">By chosen dish</strong>
          <span className="text-xs text-black/50">
            Everyone pays their item
          </span>
          <span className="mt-2 block text-xs font-black text-[#087f5b]">
            {dishVotes} vote{dishVotes === 1 ? "" : "s"}
          </span>
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {members.map((member, index) => (
          <div
            key={member}
            className="flex items-center justify-between text-sm"
          >
            <span>
              {member}
              {index === 0 ? " · host" : ""}
            </span>
            <span className="flex items-center gap-2">
              <strong>
                {unanimous === "dish"
                  ? `AED ${(basket[index]?.price ?? total / 3).toFixed(2)}`
                  : unanimous === "equal"
                    ? `AED ${(total / 3).toFixed(2)}`
                    : votes[member] === "equal"
                      ? "Equal"
                      : votes[member] === "dish"
                        ? "Own dish"
                        : "Voting…"}
              </strong>
              <i
                className={`h-2 w-2 rounded-full ${votes[member] ? "bg-[#087f5b]" : "bg-black/15"}`}
              />
            </span>
          </div>
        ))}
      </div>
      {unanimous ? (
        <div className="mt-4 rounded-xl bg-[#e6fff5] p-3 text-center">
          <p className="text-xs font-bold text-[#087f5b]">UNANIMOUS DECISION</p>
          <p className="text-sm font-black">
            {unanimous === "equal"
              ? "Split the cart equally"
              : "Pay for each chosen dish"}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-center text-xs text-black/45">
          Payment unlocks when all three agree.
        </p>
      )}
      <button
        disabled={!unanimous}
        onClick={onComplete}
        className="mt-4 w-full rounded-xl bg-[#07110d] py-3 font-black text-white disabled:opacity-25"
      >
        Confirm split & send payment links
      </button>
    </div>
  );
}

export function FoodFeed({ initialDishes }: { initialDishes: Dish[] }) {
  const [feed, setFeed] = useState(initialDishes),
    [profile, setProfile] = useState<TasteProfile>(emptyTasteProfile),
    [loaded, setLoaded] = useState(false),
    [liked, setLiked] = useState<Set<string>>(new Set()),
    [saved, setSaved] = useState<Set<string>>(new Set()),
    [basket, setBasket] = useState<Dish[]>([]),
    [toast, setToast] = useState(""),
    [panel, setPanel] = useState<Panel>(null),
    [chat, setChat] = useState("What can I get for AED 45 in 25 minutes?"),
    [reply, setReply] = useState(""),
    [chatting, setChatting] = useState(false),
    [upload, setUpload] = useState(""),
    [roomReady, setRoomReady] = useState(false),
    [split, setSplit] = useState(false);
  const [feedMode, setFeedMode] = useState<"following" | "for-you">("for-you");
  const feedRef = useRef<HTMLDivElement>(null),
    active = useRef(0),
    viewAt = useRef(0),
    profileRef = useRef(profile);
  const total = useMemo(
    () => basket.reduce((s, x) => s + x.price, 0),
    [basket],
  );
  useEffect(() => {
    viewAt.current = performance.now();
    const id = setTimeout(() => {
      try {
        const raw = localStorage.getItem("crave-taste-profile");
        if (raw) {
          const restored = {
            ...emptyTasteProfile(),
            ...JSON.parse(raw),
          } as TasteProfile;
          profileRef.current = restored;
          setProfile(restored);
          setLiked(new Set(restored.liked));
          setSaved(new Set(restored.saved));
          setFeed(rankDishes(initialDishes, restored));
        }
      } catch {}
      setLoaded(true);
    }, 0);
    return () => clearTimeout(id);
  }, [initialDishes]);
  useEffect(() => {
    if (loaded)
      try {
        localStorage.setItem("crave-taste-profile", JSON.stringify(profile));
      } catch {}
  }, [profile, loaded]);
  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 1800);
  };
  const toggle = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    id: string,
  ) =>
    setter((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const learn = (
    dish: Dish,
    signal: TasteSignal,
    value = 0,
    preserve = active.current,
  ) => {
    const next = applyTasteSignal(profileRef.current, dish, signal, value);
    profileRef.current = next;
    setProfile(next);
    setFeed((cur) => [
      ...cur.slice(0, preserve + 1),
      ...rankDishes(cur.slice(preserve + 1), next),
    ]);
  };
  const skip = (dish: Dish) => {
    learn(dish, "skip");
    feedRef.current?.children[
      Math.min(active.current + 1, feed.length - 1)
    ]?.scrollIntoView({ behavior: "smooth" });
  };
  const add = (dish: Dish) => {
    if (!basket.some((x) => x.id === dish.id)) {
      setBasket((x) => [...x, dish]);
      learn(dish, "basket");
    }
    flash(`${dish.name} added`);
  };
  const selectFeed = (mode: "following" | "for-you") => {
    setFeedMode(mode);
    active.current = 0;
    viewAt.current = 0;
    const source =
      mode === "following"
        ? initialDishes.filter((dish) => dish.reviewCreator)
        : initialDishes;
    setFeed(rankDishes(source, profileRef.current));
    requestAnimationFrame(() =>
      feedRef.current?.scrollTo({ top: 0, behavior: "smooth" }),
    );
  };
  const onScroll = (el: HTMLDivElement, now: number) => {
    const next = Math.round(el.scrollTop / el.clientHeight);
    if (next === active.current) return;
    const previous = feed[active.current],
      elapsed = viewAt.current ? now - viewAt.current : 0;
    if (previous)
      learn(previous, "dwell", elapsed, Math.max(active.current, next));
    active.current = next;
    viewAt.current = now;
  };
  async function ask() {
    setChatting(true);
    setReply("");
    try {
      const r = await fetch("/api/recommend", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt: chat }),
        }),
        data = await r.json();
      if (!r.ok) throw new Error(data.error);
      const top = data.recommendations?.[0];
      setReply(
        top
          ? `Try ${top.name} from ${top.restaurant} — AED ${top.price}, around ${top.minutes} min. I found it through Careem.`
          : "I couldn't find a strong match yet.",
      );
    } catch (e) {
      setReply(e instanceof Error ? e.message : "I couldn't search right now.");
    } finally {
      setChatting(false);
    }
  }
  function close() {
    setPanel(null);
    setSplit(false);
  }
  return (
    <div className="phone-shell">
      <span className="dynamic-island" />
      <main className="phone-screen relative h-full w-full overflow-hidden bg-[#07110d]">
        <div className="feed-tabs absolute left-1/2 top-5 z-40 flex -translate-x-1/2 gap-5 text-sm font-bold">
          <button
            onClick={() => selectFeed("following")}
            className={feedMode === "following" ? "active" : ""}
          >
            Following
          </button>
          <button
            onClick={() => selectFeed("for-you")}
            className={feedMode === "for-you" ? "active" : ""}
          >
            For You
          </button>
        </div>
        <header className="safe-top pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5">
          <div className="pointer-events-auto flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#2de3a1] text-xl font-black text-[#07110d]">
              C
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.22em] text-white/55">
                Careem
              </p>
              <p className="-mt-0.5 text-lg font-black tracking-tight">crave</p>
            </div>
          </div>
          <div className="pointer-events-auto flex gap-2">
            <button
              aria-label="Find from screenshot"
              onClick={() => setPanel("camera")}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/30 backdrop-blur"
            >
              <Icon name="camera" size={19} />
            </button>
            <button
              aria-label="Ask food assistant"
              onClick={() => setPanel("chat")}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/30 backdrop-blur"
            >
              <Icon name="chat" size={19} />
            </button>
          </div>
        </header>
        <div
          ref={feedRef}
          onScroll={(e) => onScroll(e.currentTarget, e.timeStamp)}
          className="hide-scrollbar h-full snap-y snap-mandatory overflow-y-auto"
        >
          {feed.map((dish, index) => (
            <section
              key={dish.id}
              className="grain relative h-full snap-start overflow-hidden"
            >
              <Media dish={dish} />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent via-40% to-[#07110d]" />
              {dish.reviewUrl && (
                <a
                  href={dish.reviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute left-4 top-[74px] z-20 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-white/80 backdrop-blur"
                >
                  ↗ {dish.reviewCreator} · {dish.reviewPlatform}
                </a>
              )}
              <div className="absolute bottom-[132px] left-0 right-0 z-10 flex items-end gap-3 px-5 pb-4">
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => flash(tasteReason(dish, profile))}
                    className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#2de3a1]/30 bg-[#092419]/85 px-3 py-1.5 text-xs font-bold text-[#7df2c5] backdrop-blur"
                  >
                    <Icon name="spark" size={14} />
                    {tasteScore(dish, profile)}% for you
                  </button>
                  <p className="mb-1 text-sm font-bold text-[#2de3a1]">
                    {dish.restaurant}
                  </p>
                  <h1 className="text-[30px] font-black leading-[1.03] tracking-[-.04em]">
                    {dish.name}
                  </h1>
                  <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-white/75">
                    {dish.description}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs font-semibold">
                    <span className="text-amber-300">★ {dish.rating}</span>
                    <span className="text-white/40">({dish.reviews})</span>
                    <span className="text-white/25">•</span>
                    <span>{dish.deliveryMinutes} min</span>
                    <span className="text-white/25">•</span>
                    <span>AED {dish.price}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {dish.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-white/12 px-2 py-1 text-[10px] font-bold backdrop-blur"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-3 pb-1">
                  <Action
                    label={liked.has(dish.id) ? "Loved" : "Love"}
                    icon="heart"
                    active={liked.has(dish.id)}
                    onClick={() => {
                      const yes = !liked.has(dish.id);
                      toggle(setLiked, dish.id);
                      learn(dish, yes ? "like" : "unlike");
                      if (yes) flash(`More ${dish.cuisine} coming up`);
                    }}
                  />
                  <Action
                    label="Save"
                    icon="bookmark"
                    active={saved.has(dish.id)}
                    onClick={() => {
                      const yes = !saved.has(dish.id);
                      toggle(setSaved, dish.id);
                      learn(dish, yes ? "save" : "unsave");
                    }}
                  />
                  <Action
                    label="Share"
                    icon="share"
                    onClick={() => {
                      navigator.clipboard?.writeText(location.href);
                      flash("Link copied");
                    }}
                  />
                </div>
              </div>
              <div className="absolute bottom-[76px] left-5 right-5 z-20 pt-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => skip(dish)}
                    className="grid h-12 w-12 place-items-center rounded-xl border border-white/15 bg-white/10 backdrop-blur"
                    aria-label="Not for me"
                  >
                    <Icon name="close" />
                  </button>
                  <button
                    onClick={() => add(dish)}
                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#2de3a1] font-black text-[#07110d]"
                  >
                    <Icon name="bag" size={20} />
                    Add · AED {dish.price}
                  </button>
                </div>
              </div>
              {index === 0 && (
                <div className="absolute left-1/2 top-24 z-10 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/65 backdrop-blur">
                  Swipe up · feed learns as you go
                </div>
              )}
            </section>
          ))}
        </div>
        <nav className="safe-bottom absolute inset-x-0 bottom-0 z-40 flex h-[72px] items-start justify-around border-t border-white/10 bg-[#07110d]/95 pt-2 backdrop-blur-xl">
          <button className="flex flex-col items-center gap-1 text-[10px] font-bold text-[#2de3a1]">
            <Icon name="home" size={21} />
            Discover
          </button>
          <button
            onClick={() => setPanel("camera")}
            className="flex flex-col items-center gap-1 text-[10px] font-bold text-white/50"
          >
            <Icon name="camera" size={21} />
            Find dish
          </button>
          <button
            onClick={() => setPanel("basket")}
            className="relative -mt-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#2de3a1] text-[#07110d]"
          >
            <Icon name="bag" />
            {basket.length > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-black">
                {basket.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setPanel("room")}
            className="flex flex-col items-center gap-1 text-[10px] font-bold text-white/50"
          >
            <Icon name="users" size={21} />
            Together
          </button>
          <button
            onClick={() => setPanel("profile")}
            className="flex flex-col items-center gap-1 text-[10px] font-bold text-white/50"
          >
            <Icon name="spark" size={21} />
            Your taste
          </button>
        </nav>
        {toast && (
          <div className="pop absolute left-1/2 top-24 z-50 w-max max-w-[85%] -translate-x-1/2 rounded-full bg-white px-4 py-2 text-center text-xs font-bold text-[#07110d] shadow-xl">
            {toast}
          </div>
        )}
        {panel && (
          <div
            className="absolute inset-0 z-50 bg-black/65 backdrop-blur-sm"
            onClick={close}
          >
            <aside
              onClick={(e) => e.stopPropagation()}
              className="sheet absolute inset-x-0 bottom-0 max-h-[88%] overflow-auto rounded-t-[28px] bg-[#102019] p-5 pb-9 shadow-2xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#2de3a1]">
                    {panel === "room"
                      ? "Together"
                      : panel === "camera"
                        ? "Visual search"
                        : panel === "chat"
                          ? "Ask Crave"
                          : panel === "profile"
                            ? "Taste intelligence"
                            : "Your basket"}
                  </p>
                  <h2 className="text-2xl font-black">
                    {panel === "room"
                      ? "Find the group craving"
                      : panel === "camera"
                        ? "See it. Find it."
                        : panel === "chat"
                          ? "What are you in the mood for?"
                          : panel === "profile"
                            ? "Your feed knows you"
                            : "Ready when you are"}
                  </h2>
                </div>
                <button
                  onClick={close}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/10"
                >
                  <Icon name="close" size={18} />
                </button>
              </div>
              {panel === "camera" && (
                <div>
                  {upload ? (
                    <div className="space-y-4">
                      <img
                        src={upload}
                        alt="Uploaded food"
                        className="h-48 w-full rounded-2xl object-cover"
                      />
                      <div className="rounded-2xl bg-[#173027] p-4">
                        <p className="text-xs font-bold text-[#2de3a1]">
                          VISUAL MATCH · 94%
                        </p>
                        <p className="mt-1 text-lg font-black">
                          Spicy Salmon Crunch
                        </p>
                        <p className="text-sm text-white/55">
                          3 nearby matches on Careem · from AED 42
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          close();
                          feedRef.current?.children[2]?.scrollIntoView({
                            behavior: "smooth",
                          });
                        }}
                        className="w-full rounded-xl bg-[#2de3a1] py-3 font-black text-[#07110d]"
                      >
                        Show similar dishes
                      </button>
                    </div>
                  ) : (
                    <label className="grid h-52 cursor-pointer place-items-center rounded-2xl border border-dashed border-white/25 bg-white/5 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setUpload(URL.createObjectURL(f));
                        }}
                      />
                      <span>
                        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#2de3a1] text-[#07110d]">
                          <Icon name="camera" />
                        </span>
                        <strong>Upload a food screenshot</strong>
                        <small className="mt-1 block text-white/45">
                          We&apos;ll find similar dishes nearby
                        </small>
                      </span>
                    </label>
                  )}
                </div>
              )}
              {panel === "chat" && (
                <div>
                  <div className="mb-4 rounded-2xl bg-white/5 p-4 text-sm leading-6 text-white/70">
                    I can search by craving, budget, dietary needs or delivery
                    time—without replacing your feed.
                  </div>
                  {reply && (
                    <div className="mb-4 rounded-2xl bg-[#17382c] p-4 text-sm leading-6 text-white">
                      {reply}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <textarea
                      value={chat}
                      onChange={(e) => setChat(e.target.value)}
                      rows={2}
                      className="min-w-0 flex-1 resize-none rounded-xl bg-white/10 p-3 text-sm outline-none"
                    />
                    <button
                      onClick={ask}
                      disabled={chatting}
                      className="grid w-12 place-items-center rounded-xl bg-[#2de3a1] text-[#07110d] disabled:opacity-40"
                    >
                      <Icon name="send" size={20} />
                    </button>
                  </div>
                </div>
              )}
              {panel === "room" && (
                <TogetherPanel
                  baseDish={initialDishes[0]}
                  onCreateCart={(items) => {
                    setBasket(items);
                    setPanel("basket");
                  }}
                />
              )}
              {false && panel === "room" && (
                <div>
                  {!roomReady ? (
                    <div>
                      <div className="mb-4 flex -space-x-2">
                        <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#102019] bg-[#5844d8] font-black">
                          R
                        </span>
                        <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#102019] bg-[#ef755b] font-black">
                          M
                        </span>
                        <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#102019] bg-white/10 text-white/40">
                          +3
                        </span>
                      </div>
                      <p className="mb-5 text-sm leading-6 text-white/60">
                        Everyone swipes privately. When tastes overlap, the room
                        reveals a match—no group-chat debate.
                      </p>
                      <button
                        onClick={() => setRoomReady(true)}
                        className="w-full rounded-xl bg-[#2de3a1] py-3 font-black text-[#07110d]"
                      >
                        Create room · CRAVE42
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-5xl">🎉</p>
                      <p className="mt-3 text-xs font-bold text-[#2de3a1]">
                        3-WAY MATCH
                      </p>
                      <h3 className="mt-1 text-2xl font-black">
                        Truffle Smash
                      </h3>
                      <p className="mt-2 text-sm text-white/55">
                        You, Reem and Mohammed all loved it.
                      </p>
                      <button
                        onClick={() => {
                          setBasket([initialDishes[0]]);
                          setPanel("basket");
                        }}
                        className="mt-5 w-full rounded-xl bg-[#2de3a1] py-3 font-black text-[#07110d]"
                      >
                        Order together
                      </button>
                    </div>
                  )}
                </div>
              )}
              {panel === "profile" && (
                <div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/5 p-4">
                      <p className="text-xs text-white/45">Usually spend</p>
                      <p className="mt-1 text-2xl font-black">AED 42</p>
                      <p className="text-xs text-[#2de3a1]">Arabic food</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-4">
                      <p className="text-xs text-white/45">Top taste</p>
                      <p className="mt-1 text-2xl font-black">Italian</p>
                      <p className="text-xs text-[#2de3a1]">+18% affinity</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-[#2de3a1]/20 bg-[#0c2a20] p-4">
                    <div className="flex gap-3">
                      <Icon name="spark" />
                      <div>
                        <p className="font-bold">
                          Why your feed looks like this
                        </p>
                        <p className="mt-1 text-sm leading-6 text-white/55">
                          Order history sets a budget per cuisine. Likes, saves,
                          skips and watch time continuously re-rank what comes
                          next.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {panel === "basket" && (
                <div>
                  {basket.length === 0 ? (
                    <p className="py-8 text-center text-sm text-white/55">
                      Add a dish that makes you stop scrolling.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {basket.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-xl bg-white/5 p-3"
                        >
                          <div>
                            <p className="font-bold">{item.name}</p>
                            <p className="text-xs text-white/50">
                              {item.restaurant}
                            </p>
                          </div>
                          <span className="text-sm font-bold">
                            AED {item.price}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                    <div>
                      <p className="text-xs text-white/45">Subtotal</p>
                      <p className="text-2xl font-black">AED {total}</p>
                    </div>
                    <button
                      disabled={!basket.length}
                      onClick={() => setSplit(true)}
                      className="rounded-xl bg-[#2de3a1] px-5 py-3 font-black text-[#07110d] disabled:opacity-30"
                    >
                      <Icon name="card" size={18} />{" "}
                      <span className="ml-1">Split & checkout</span>
                    </button>
                  </div>
                  {split && (
                    <SplitVote
                      basket={basket}
                      total={total}
                      onComplete={() => flash("Payment links sent")}
                    />
                  )}
                </div>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
