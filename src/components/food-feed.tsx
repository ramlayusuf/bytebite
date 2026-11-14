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
  | "send"
  | "search"
  | "comment"
  | "plus"
  | "check"
  | "link"
  | "eyeOff"
  | "play"
  | "star"
  | "chevronUp";
type Panel =
  | "basket"
  | "camera"
  | "room"
  | "chat"
  | "profile"
  | "reviews"
  | "share"
  | null;

/* Outline icons (sheets, nav) */
const outline: Partial<Record<IconName, React.ReactNode>> = {
  heart: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.8-7.7 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
  ),
  bookmark: <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />,
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
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12 5 5L20 7" />,
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M17.9 17.9A10.4 10.4 0 0 1 12 20c-7 0-10-8-10-8a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A9.6 9.6 0 0 1 12 4c7 0 10 8 10 8a18.3 18.3 0 0 1-2.2 3.2" />
      <path d="M14.1 14.1a3 3 0 1 1-4.2-4.2M2 2l20 20" />
    </>
  ),
  chevronUp: <path d="m6 15 6-6 6 6" />,
};

/* Solid icons (TikTok right rail) */
const solid: Partial<Record<IconName, React.ReactNode>> = {
  heart: (
    <path d="M12 21.4 10.6 20C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.6 11.5L12 21.4Z" />
  ),
  comment: (
    <path d="M12 3C6.5 3 2 6.8 2 11.4c0 2.6 1.4 4.9 3.7 6.5L5 21.5l4.2-2.2c.9.2 1.8.3 2.8.3 5.5 0 10-3.8 10-8.4S17.5 3 12 3Zm-4.5 9.6a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Zm4.5 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Zm4.5 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Z" />
  ),
  bookmark: <path d="M6 2.5h12A1.5 1.5 0 0 1 19.5 4v18L12 17.6 4.5 22V4A1.5 1.5 0 0 1 6 2.5Z" />,
  share: <path d="M13.5 3.5v4.3C6.8 8.6 3.2 13 2.5 20.5c2.6-3.6 6.2-5.3 11-5.3v4.3l8-8-8-8Z" />,
  play: <path d="M8 5v14l11-7L8 5Z" />,
  star: (
    <path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.8Z" />
  ),
  home: (
    <path d="M12 2.6 2.4 11a1 1 0 0 0 .7 1.8H5V21a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-8.2h1.9a1 1 0 0 0 .7-1.8L12 2.6Z" />
  ),
};

function Icon({
  name,
  filled = false,
  solid: useSolid = false,
  size = 24,
  stroke = 2,
}: {
  name: IconName;
  filled?: boolean;
  solid?: boolean;
  size?: number;
  stroke?: number;
}) {
  const isSolid = useSolid && solid[name];
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={isSolid || filled ? "currentColor" : "none"}
      stroke={isSolid ? "none" : "currentColor"}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {isSolid ? solid[name] : outline[name]}
    </svg>
  );
}

/* "2.4k" → 2400 */
const parseCount = (value: string) => {
  const n = parseFloat(value);
  if (/m$/i.test(value)) return n * 1_000_000;
  if (/k$/i.test(value)) return n * 1_000;
  return n;
};
const formatCount = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
    : n >= 10_000
      ? `${Math.round(n / 1000)}K`
      : n >= 1_000
        ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`
        : `${Math.round(n)}`;
const hashtag = (tag: string) =>
  "#" + tag.replace(/[^a-z0-9]+/gi, " ").trim().replace(/\s+(.)/g, (_, c: string) => c.toUpperCase()).replace(/^./, (c) => c.toLowerCase());

function RailButton({
  label,
  count,
  icon,
  active,
  activeClass = "text-careem",
  onClick,
}: {
  label: string;
  count: string;
  icon: IconName;
  active?: boolean;
  activeClass?: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className="flex flex-col items-center gap-0.5"
    >
      <span
        className={`icon-shadow transition active:scale-90 ${active ? `${activeClass} pop` : "text-white"}`}
      >
        <Icon name={icon} solid size={36} />
      </span>
      <span className="text-shadow text-[13px] font-semibold leading-4 text-white">
        {count}
      </span>
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

function ShareOption({
  label,
  icon,
  tone,
  onClick,
}: {
  label: string;
  icon: IconName;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 text-[13px] font-medium leading-4"
    >
      <span className={`grid h-14 w-14 place-items-center rounded-full ${tone}`}>
        <Icon name={icon} size={24} />
      </span>
      {label}
    </button>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-careem text-[16px] font-bold text-ink transition active:scale-[.98] disabled:opacity-35 ${className}`}
    >
      {children}
    </button>
  );
}

function TogetherPanel({
  baseDish,
  onCreateCart,
}: {
  baseDish: Dish;
  onCreateCart: (items: Dish[]) => Promise<void>;
}) {
  const [room, setRoom] = useState(false);
  const [card, setCard] = useState(0);
  const [matched, setMatched] = useState(false);
  const [motion, setMotion] = useState<"yes" | "no" | null>(null);
  const [dragX, setDragX] = useState(0);
  const [preparing, setPreparing] = useState(false);
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
          <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-white bg-[#5844d8] font-bold text-white">
            R
          </span>
          <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-white bg-[#ef755b] font-bold text-white">
            M
          </span>
          <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-white bg-mist font-semibold text-ink/60">
            +3
          </span>
        </div>
        <p className="mb-5 text-[15px] leading-6 text-ink/70">
          Everyone swipes privately. A match happens when the group chooses
          dishes from the same restaurant.
        </p>
        <PrimaryButton onClick={() => setRoom(true)}>
          Create room · BYTE42
        </PrimaryButton>
      </div>
    );

  if (matched)
    return (
      <div>
        <div className="text-center">
          <p className="text-[13px] font-bold tracking-wide text-careem-deep">
            RESTAURANT MATCH
          </p>
          <h3 className="mt-1 text-2xl font-bold">
            Everyone chose Eleven Green
          </h3>
          <p className="mt-2 text-[15px] text-ink/65">
            One restaurant, three dishes, one shared delivery.
          </p>
        </div>
        <div className="mt-4 space-y-2">
          {choices.map((dish, index) => (
            <div
              key={dish.id}
              className="flex items-center gap-3 rounded-xl bg-mist p-2"
            >
              <img
                src={dish.imageUrl}
                alt=""
                className="h-12 w-12 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">
                  {dish.name}
                </p>
                <p className="text-[13px] text-ink/60">
                  {["You", "Reem", "Mohammed"][index]} · AED {dish.price}
                </p>
              </div>
              <span className="mr-2 text-careem-deep">
                <Icon name="check" size={20} />
              </span>
            </div>
          ))}
        </div>
        <PrimaryButton
          disabled={preparing}
          onClick={async () => {
            setPreparing(true);
            try {
              await onCreateCart(choices);
            } finally {
              setPreparing(false);
            }
          }}
          className="mt-5 disabled:opacity-50"
        >
          {preparing ? "Checking the live Careem menu…" : "Prepare host basket"}
        </PrimaryButton>
      </div>
    );

  const dish = choices[card];
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-[13px]">
        <span className="font-bold text-careem-deep">ROOM BYTE42</span>
        <span className="text-ink/60">
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
        className={`relative touch-none cursor-grab overflow-hidden rounded-[22px] bg-ink text-white shadow-lg transition duration-300 active:cursor-grabbing ${motion === "yes" ? "translate-x-full rotate-12 opacity-0" : motion === "no" ? "-translate-x-full -rotate-12 opacity-0" : ""}`}
      >
        <img
          src={dish.imageUrl}
          alt={dish.name}
          className="h-72 w-full select-none object-cover"
          draggable={false}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-5 pt-20">
          <p className="text-[14px] font-semibold text-careem">
            {dish.restaurant}
          </p>
          <h3 className="text-2xl font-bold">{dish.name}</h3>
          <p className="mt-1 text-[15px] text-white/85">
            AED {dish.price} · {dish.deliveryMinutes} min
          </p>
        </div>
        {(motion || Math.abs(dragX) > 35) && (
          <span
            className={`absolute top-5 rounded-lg border-4 bg-black/30 px-3 py-1 text-2xl font-black ${motion === "yes" || (!motion && dragX > 0) ? "left-5 -rotate-12 border-careem text-careem" : "right-5 rotate-12 border-red-400 text-red-400"}`}
          >
            {motion === "yes" || (!motion && dragX > 0) ? "YES" : "NOPE"}
          </span>
        )}
      </div>
      <div className="mt-5 flex justify-center gap-6">
        <button
          onClick={() => vote(false)}
          aria-label="No"
          className="grid h-16 w-16 place-items-center rounded-full border border-red-200 bg-red-50 text-red-500"
        >
          <Icon name="close" size={28} />
        </button>
        <button
          onClick={() => vote(true)}
          aria-label="Yes"
          className="grid h-16 w-16 place-items-center rounded-full bg-careem text-ink"
        >
          <Icon name="heart" solid size={28} />
        </button>
      </div>
      <p className="mt-3 text-center text-[13px] text-ink/60">
        Swipe privately · friends can&apos;t see your votes
      </p>
    </div>
  );
}

type SplitChoice = "equal" | "dish";
type GroupPlan = {
  confirmationId: string;
  selections: Record<string, string[]>;
  restaurant: string;
};

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
    <div className="pop mt-5 rounded-2xl border border-ink/10 bg-mist p-4">
      <p className="text-[13px] font-bold tracking-wide text-careem-deep">
        GROUP VOTE
      </p>
      <h3 className="mt-1 text-lg font-bold">How should we contribute?</h3>
      <p className="mt-1 text-[13px] text-ink/60">
        ByteBite tracks contributions; Careem charges the host for the basket.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {(
          [
            ["equal", "Split equally", `AED ${(total / 3).toFixed(2)} each`, equalVotes],
            ["dish", "By chosen dish", "Everyone pays their item", dishVotes],
          ] as const
        ).map(([choice, title, sub, count]) => (
          <button
            key={choice}
            onClick={() => castVote(choice)}
            className={`rounded-xl border-2 bg-white p-3 text-left ${votes.You === choice ? "border-careem-deep" : "border-transparent"}`}
          >
            <strong className="block text-[15px]">{title}</strong>
            <span className="text-[13px] text-ink/60">{sub}</span>
            <span className="mt-2 block text-[13px] font-bold text-careem-deep">
              {count} vote{count === 1 ? "" : "s"}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {members.map((member, index) => (
          <div
            key={member}
            className="flex items-center justify-between text-[15px]"
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
                className={`h-2 w-2 rounded-full ${votes[member] ? "bg-careem-deep" : "bg-ink/15"}`}
              />
            </span>
          </div>
        ))}
      </div>
      {unanimous ? (
        <div className="mt-4 rounded-xl bg-careem-soft p-3 text-center">
          <p className="text-[13px] font-bold text-careem-deep">
            UNANIMOUS DECISION
          </p>
          <p className="text-[15px] font-bold">
            {unanimous === "equal"
              ? "Split the cart equally"
              : "Pay for each chosen dish"}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-center text-[13px] text-ink/60">
          Host confirmation unlocks when all three agree.
        </p>
      )}
      <button
        disabled={!unanimous}
        onClick={onComplete}
        className="mt-4 h-12 w-full rounded-xl bg-ink font-bold text-white disabled:opacity-25"
      >
        Add to host&apos;s Careem basket
      </button>
    </div>
  );
}

function CareemStatus() {
  return (
    <div className="flex items-center justify-between px-6 pt-4 text-sm font-black">
      <span>12:25</span>
      <span className="flex items-center gap-2 text-xs">
        ▮▮▮ ◉ <b className="rounded bg-white/80 px-1 text-[#064c40]">42</b>
      </span>
    </div>
  );
}

function CareemConnect() {
  return (
    <div className="flex h-full flex-col bg-[#005448] px-7 text-white">
      <CareemStatus />
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="grid h-20 w-20 place-items-center rounded-[24px] bg-[#2de3a1] text-5xl font-black text-[#073f36] shadow-xl">
          C
        </span>
        <p className="mt-8 text-xs font-bold uppercase tracking-[.22em] text-[#7ff2c8]">
          Careem × ByteBite
        </p>
        <h1 className="mt-3 text-4xl font-black leading-tight">
          Connect your
          <br />
          Careem account
        </h1>
        <p className="mt-4 max-w-[280px] text-sm leading-6 text-white/65">
          Discover real dishes, use your saved addresses and turn every craving
          into a Careem basket.
        </p>
        <a
          href="/api/careem/auth"
          className="mt-8 w-full rounded-2xl bg-[#2de3a1] py-4 text-base font-black text-[#073f36] shadow-lg"
        >
          Connect to Careem
        </a>
        <p className="mt-4 text-[10px] leading-4 text-white/40">
          Secure sign-in through Careem Identity.
          <br />
          ByteBite never sees your password.
        </p>
      </div>
    </div>
  );
}

function CareemHome({ onFood }: { onFood: () => void }) {
  const services = [
    ["🚘", "Rides"],
    ["🍔", "Food"],
    ["🛒", "Quik"],
    ["🪙", "Pay"],
    ["🚕", "Hala Taxi"],
    ["🛍️", "Shops"],
    ["🛵", "Box"],
    ["🧺", "Home&Care"],
  ];
  return (
    <div className="h-full overflow-y-auto bg-[#f6f6f6] text-[#101514]">
      <div className="rounded-b-[28px] bg-[#005448] pb-5 text-white">
        <CareemStatus />
        <div className="mx-4 mt-7 flex h-14 items-center justify-between rounded-2xl bg-[#e8eeee] px-4 text-lg text-black/70">
          <span>Discover Careem</span>
          <span className="text-3xl font-light">⌕</span>
        </div>
      </div>
      <section className="-mt-1 rounded-t-[28px] bg-white px-4 pb-5 pt-5">
        <div className="grid grid-cols-4 gap-2">
          {services.map(([emoji, label], index) => (
            <button
              key={label}
              onClick={index === 1 ? onFood : undefined}
              className="relative flex aspect-[.82] flex-col items-center justify-center rounded-2xl bg-[#f1f2f3] text-center"
            >
              <span className="text-4xl drop-shadow-sm">{emoji}</span>
              <strong className="mt-2 text-[11px]">{label}</strong>
              {index === 1 && (
                <i className="absolute -top-2 rounded bg-[#006b55] px-2 py-1 text-[8px] not-italic text-[#4bffc3]">
                  FlashSale
                </i>
              )}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-[10px]">
          <div className="rounded-xl border border-black/10 p-3">
            <span className="text-black/55">Balance</span>
            <b className="mt-1 block text-sm">AED 0.00</b>
          </div>
          <div className="rounded-xl border border-black/10 p-3">
            <span className="text-black/55">Resend to</span>
            <b className="mt-1 block text-sm">Sadia Hasan</b>
          </div>
          <div className="rounded-xl border border-black/10 p-3">
            <span className="text-black/55">Add card</span>
            <b className="mt-1 block text-sm">Set up</b>
          </div>
        </div>
      </section>
      <section className="bg-[#f4dfb9] px-5 py-6">
        <p className="text-2xl font-black leading-tight text-[#005448]">
          Freshness, at
          <br />
          your fingertips
        </p>
        <p className="mt-1 text-sm">Groceries delivered in 15 mins</p>
        <div className="mt-5 flex gap-3 overflow-hidden">
          {[
            ["🍌", "Bananas Ecuador"],
            ["🧅", "Onions Red India"],
            ["🍅", "Tomatoes"],
          ].map(([emoji, name]) => (
            <div key={name} className="min-w-[126px] rounded-2xl bg-white p-3">
              <div className="grid h-24 place-items-center rounded-xl bg-[#f6fae9] text-5xl">
                {emoji}
              </div>
              <p className="mt-2 text-xs font-bold">{name}</p>
            </div>
          ))}
        </div>
      </section>
      <CareemBottom active="home" />
    </div>
  );
}

function CareemBottom({
  active,
  onCrave,
}: {
  active: "home" | "food";
  onCrave?: () => void;
}) {
  const items = [
    ["⌂", "Home"],
    ["⌕", "Search"],
    ["▤", "Orders"],
    ["camera", "Crave"],
    ["♙", "Profile"],
  ].filter(([, label]) => active === "food" || label !== "Crave");
  return (
    <nav className="sticky bottom-0 z-30 flex h-[70px] items-start justify-around border-t border-black/5 bg-[#005448] px-1 pt-2 text-white">
      {items.map(([icon, label]) => (
        <button
          key={label}
          onClick={label === "Crave" ? onCrave : undefined}
          className={`flex min-w-0 flex-col items-center gap-1 text-[9px] font-bold ${label.toLowerCase() === active ? "text-white" : "text-white/60"}`}
        >
          {icon === "camera" ? (
            <Icon name="camera" size={21} />
          ) : (
            <span className="text-xl leading-5">{icon}</span>
          )}
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function CareemFood({ onCrave }: { onCrave: () => void }) {
  const restaurants = [
    ["/food/dishes/burger.jpg", "Eleven Green", "24 min"],
    ["/food/dishes/shawarma.jpg", "Allo Beirut", "19 min"],
    ["/food/dishes/sushi.jpg", "3Fils", "31 min"],
  ];
  return (
    <div className="h-full overflow-y-auto bg-[#f6f6f6] text-[#101514]">
      <div className="bg-[#005448] pb-5 text-white">
        <CareemStatus />
        <div className="px-5 pt-5">
          <p className="text-[10px] text-white/65">Deliver to</p>
          <p className="text-sm font-bold">Dubai Marina⌄</p>
          <div className="mt-4 flex h-12 items-center rounded-xl bg-white px-4 text-sm text-black/45">
            <span className="mr-2 text-xl">⌕</span>Search dishes or restaurants
          </div>
        </div>
      </div>
      <main className="px-4 pb-4">
        <section className="mt-4 overflow-hidden rounded-2xl bg-[#d8f7e9] p-5">
          <p className="text-[10px] font-bold uppercase text-[#087f5b]">
            Only on Careem
          </p>
          <h2 className="mt-1 text-2xl font-black leading-tight">
            Your next craving
            <br />
            is one tap away.
          </h2>
          <p className="mt-2 text-xs text-black/55">
            Popular dishes near you, delivered fast.
          </p>
        </section>
        <h3 className="mt-5 text-lg font-black">What are you craving?</h3>
        <div className="mt-3 flex gap-3 overflow-hidden">
          {[
            ["🍔", "Burgers"],
            ["🍣", "Sushi"],
            ["🍕", "Pizza"],
            ["🥙", "Arabic"],
          ].map(([emoji, name]) => (
            <div key={name} className="min-w-[72px] text-center">
              <div className="grid h-16 place-items-center rounded-full bg-white text-3xl shadow-sm">
                {emoji}
              </div>
              <p className="mt-1 text-[10px] font-bold">{name}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between">
          <h3 className="text-lg font-black">Popular near you</h3>
          <span className="text-xs font-bold text-[#087f5b]">See all</span>
        </div>
        <div className="mt-3 space-y-3">
          {restaurants.map(([image, name, time]) => (
            <div
              key={name}
              className="flex gap-3 rounded-2xl bg-white p-2 shadow-sm"
            >
              <img
                src={image}
                alt=""
                className="h-20 w-24 rounded-xl object-cover"
              />
              <div className="py-1">
                <p className="font-black">{name}</p>
                <p className="mt-1 text-xs text-black/45">
                  4.8 ★ · AED 5 delivery
                </p>
                <p className="mt-2 text-xs font-bold text-[#087f5b]">{time}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
      <CareemBottom active="food" onCrave={onCrave} />
    </div>
  );
}
const panelTitles: Record<Exclude<Panel, null>, [string, string]> = {
  room: ["Together", "Find the group craving"],
  camera: ["Visual search", "See it. Find it."],
  chat: ["Ask Crave", "What are you in the mood for?"],
  profile: ["Your taste", "Your feed knows you"],
  basket: ["Your basket", "Ready when you are"],
  reviews: ["Reviews", ""],
  share: ["Share to", ""],
};

export function FoodFeed({ initialDishes }: { initialDishes: Dish[] }) {
  const [feed, setFeed] = useState(initialDishes),
    [profile, setProfile] = useState<TasteProfile>(emptyTasteProfile),
    [loaded, setLoaded] = useState(false),
    [liked, setLiked] = useState<Set<string>>(new Set()),
    [saved, setSaved] = useState<Set<string>>(new Set()),
    [following, setFollowing] = useState<Set<string>>(new Set()),
    [basket, setBasket] = useState<Dish[]>([]),
    [toast, setToast] = useState(""),
    [panel, setPanel] = useState<Panel>(null),
    [panelDish, setPanelDish] = useState<Dish | null>(null),
    [chat, setChat] = useState("What can I get for AED 45 in 25 minutes?"),
    [reply, setReply] = useState(""),
    [chatting, setChatting] = useState(false),
    [upload, setUpload] = useState(""),
    [split, setSplit] = useState(false),
    [groupPlan, setGroupPlan] = useState<GroupPlan | null>(null),
    [committingGroup, setCommittingGroup] = useState(false),
    [expanded, setExpanded] = useState<string | null>(null),
    [activeIndex, setActiveIndex] = useState(0),
    [bursts, setBursts] = useState<
      { id: number; dishId: string; x: number; y: number }[]
    >([]),
    [hint, setHint] = useState(true);
  const [feedMode, setFeedMode] = useState<"following" | "for-you">("for-you");
  const [appScreen, setAppScreen] = useState<
    "connect" | "home" | "food" | "crave"
  >("connect");
  useEffect(() => {
    if (appScreen !== "connect") return;
    fetch("/api/careem/status", { cache: "no-store" })
      .then((response) => {
        if (response.ok) setAppScreen("home");
      })
      .catch(() => undefined);
  }, [appScreen]);
  const feedRef = useRef<HTMLDivElement>(null),
    active = useRef(0),
    viewAt = useRef(0),
    profileRef = useRef(profile),
    toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined),
    burstSeq = useRef(0);
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
    const hintId = setTimeout(() => setHint(false), 4500);
    return () => {
      clearTimeout(id);
      clearTimeout(hintId);
    };
  }, [initialDishes]);
  useEffect(() => {
    if (loaded)
      try {
        localStorage.setItem("crave-taste-profile", JSON.stringify(profile));
      } catch {}
  }, [profile, loaded]);
  const flash = (m: string) => {
    clearTimeout(toastTimer.current);
    setToast(m);
    toastTimer.current = setTimeout(() => setToast(""), 2000);
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
  const like = (dish: Dish) => {
    const yes = !liked.has(dish.id);
    toggle(setLiked, dish.id);
    learn(dish, yes ? "like" : "unlike");
    if (yes) flash(`More ${dish.cuisine} coming up`);
  };
  const doubleTapLike = (dish: Dish, x: number, y: number) => {
    const id = ++burstSeq.current;
    setBursts((b) => [...b, { id, dishId: dish.id, x, y }]);
    setTimeout(() => setBursts((b) => b.filter((p) => p.id !== id)), 900);
    if (!liked.has(dish.id)) like(dish);
  };
  const skip = (dish: Dish) => {
    learn(dish, "skip");
    feedRef.current?.children[
      Math.min(active.current + 1, feed.length - 1)
    ]?.scrollIntoView({ behavior: "smooth" });
  };
  const add = async (dish: Dish) => {
    try {
      const location = await new Promise<{
        latitude: number;
        longitude: number;
      }>((resolve) =>
        navigator.geolocation.getCurrentPosition(
          (position) =>
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          () => resolve({ latitude: 25.0866, longitude: 55.1474 }),
          { enableHighAccuracy: true, timeout: 6000 },
        ),
      );
      flash("Checking Careem availability…");
      const preparedResponse = await fetch("/api/basket", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "prepare",
          dishName: dish.name,
          restaurantName: dish.restaurant,
          ...location,
        }),
      });
      const prepared = await preparedResponse.json();
      if (!preparedResponse.ok) throw new Error(prepared.error);
      const options: string[] = [];
      for (const group of prepared.requiredOptions ?? []) {
        const answer = window.prompt(
          `${group.name}\n${group.options.map((option: { name: string; price: number }, index: number) => `${index + 1}. ${option.name}${option.price ? ` (+AED ${option.price})` : ""}`).join("\n")}\n\nEnter a number:`,
        );
        if (!answer) return flash("Nothing was added");
        const selected = group.options[Number(answer) - 1];
        if (!selected) throw new Error(`Invalid choice for ${group.name}`);
        options.push(selected.id);
      }
      const confirmed = window.confirm(
        `Add ${prepared.item.name} from ${prepared.item.restaurant} to your REAL Careem basket${prepared.item.price ? ` for AED ${prepared.item.price}` : ""}?`,
      );
      if (!confirmed) return flash("Nothing was added");
      const committedResponse = await fetch("/api/basket", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "commit",
          confirmationId: prepared.confirmationId,
          options,
        }),
      });
      const committed = await committedResponse.json();
      if (!committedResponse.ok) throw new Error(committed.error);
      if (!basket.some((item) => item.id === dish.id)) {
        setBasket((items) => [...items, dish]);
        learn(dish, "basket");
      }
      flash(`${committed.item.name} added to Careem`);
    } catch (error) {
      flash(
        error instanceof Error
          ? error.message
          : "Could not update Careem basket",
      );
    }
  };
  const selectFeed = (mode: "following" | "for-you") => {
    setFeedMode(mode);
    active.current = 0;
    setActiveIndex(0);
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
  const prepareGroupBasket = async (mockItems: Dish[]) => {
    const location = await new Promise<{
      latitude: number;
      longitude: number;
    }>((resolve) =>
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        () => resolve({ latitude: 25.0866, longitude: 55.1474 }),
        { enableHighAccuracy: true, timeout: 6000 },
      ),
    );
    const response = await fetch("/api/basket", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "prepare-group",
        restaurantName: mockItems[0]?.restaurant,
        query: "burger",
        ...location,
      }),
    });
    const prepared = await response.json();
    if (!response.ok) throw new Error(prepared.error);
    const selections: Record<string, string[]> = {};
    for (const item of prepared.items) {
      selections[item.id] = [];
      for (const group of item.requiredOptions ?? []) {
        const answer = window.prompt(
          `${item.name}: ${group.name}\n${group.options.map((option: { name: string; price: number }, index: number) => `${index + 1}. ${option.name}${option.price ? ` (+AED ${option.price})` : ""}`).join("\n")}\n\nEnter a number:`,
        );
        if (!answer) throw new Error("Group basket preparation cancelled.");
        const selected = group.options[Number(answer) - 1];
        if (!selected) throw new Error(`Invalid choice for ${group.name}.`);
        selections[item.id].push(selected.id);
      }
    }
    const realItems: Dish[] = prepared.items.map(
      (item: { id: string; name: string; price: number; imageUrl?: string }) => ({
        ...mockItems[0],
        id: `careem-${item.id}`,
        name: item.name,
        restaurant: prepared.restaurant,
        price: item.price,
        imageUrl: item.imageUrl || mockItems[0].imageUrl,
      }),
    );
    setGroupPlan({
      confirmationId: prepared.confirmationId,
      selections,
      restaurant: prepared.restaurant,
    });
    setBasket(realItems);
    setPanel("basket");
    flash("Live Careem items prepared — vote before the host adds them");
  };

  const commitGroupBasket = async () => {
    if (!groupPlan || committingGroup) return;
    const confirmed = window.confirm(
      `Add these ${basket.length} items from ${groupPlan.restaurant} to YOUR REAL Careem basket? Careem will charge you, the host, for the full order. ByteBite contribution amounts are simulated and no money is collected from friends.`,
    );
    if (!confirmed) return flash("Nothing was added");
    setCommittingGroup(true);
    try {
      const response = await fetch("/api/basket", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "commit-group",
          confirmationId: groupPlan.confirmationId,
          selections: groupPlan.selections,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setGroupPlan(null);
      setSplit(false);
      flash(
        result.partial
          ? "Careem added some items; review the basket before checkout"
          : "Items added to the host’s Careem basket",
      );
    } catch (error) {
      flash(
        error instanceof Error ? error.message : "Could not update the basket",
      );
    } finally {
      setCommittingGroup(false);
    }
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
    setActiveIndex(next);
    setExpanded(null);
    setHint(false);
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
  function open(next: Exclude<Panel, null>, dish: Dish | null = null) {
    setPanelDish(dish);
    setPanel(next);
  }
  function close() {
    setPanel(null);
    setSplit(false);
  }
  const navItem = (
    label: string,
    icon: IconName,
    isActive: boolean,
    onClick?: () => void,
  ) => (
    <button
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={`flex w-16 flex-col items-center gap-0.5 whitespace-nowrap text-[11px] font-semibold ${isActive ? "text-white" : "text-white/65"}`}
    >
      <Icon name={icon} solid={isActive} size={25} stroke={1.8} />
      {label}
    </button>
  );

  if (appScreen === "connect")
    return (
      <div className="phone-shell">
        <span className="dynamic-island" />
        <main className="phone-screen relative h-full w-full overflow-hidden">
          <CareemConnect />
        </main>
      </div>
    );
  if (appScreen === "home")
    return (
      <div className="phone-shell">
        <span className="dynamic-island" />
        <main className="phone-screen relative h-full w-full overflow-hidden">
          <CareemHome onFood={() => setAppScreen("food")} />
        </main>
      </div>
    );
  if (appScreen === "food")
    return (
      <div className="phone-shell">
        <span className="dynamic-island" />
        <main className="phone-screen relative h-full w-full overflow-hidden">
          <CareemFood onCrave={() => setAppScreen("crave")} />
        </main>
      </div>
    );
  return (
    <div className="phone-shell">
      <span className="dynamic-island" />
      <main className="phone-screen relative flex h-full w-full flex-col overflow-hidden bg-black">
        <div className="relative min-h-0 flex-1">
          {/* Top bar */}
          <header className="safe-top pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 pb-2">
            <button
              aria-label="Find a dish from a screenshot"
              onClick={() => open("camera")}
              className="icon-shadow pointer-events-auto grid h-10 w-10 place-items-center text-white"
            >
              <Icon name="camera" size={25} stroke={1.9} />
            </button>
            <div className="feed-tabs text-shadow pointer-events-auto flex items-center gap-5 text-[17px] font-bold">
              <button
                onClick={() => selectFeed("following")}
                className={feedMode === "following" ? "active" : ""}
              >
                Following
              </button>
              <span aria-hidden className="h-3.5 w-px bg-white/40" />
              <button
                onClick={() => selectFeed("for-you")}
                className={feedMode === "for-you" ? "active" : ""}
              >
                For You
              </button>
            </div>
            <button
              aria-label="Ask Crave"
              onClick={() => open("chat")}
              className="icon-shadow pointer-events-auto grid h-10 w-10 place-items-center text-white"
            >
              <Icon name="search" size={26} stroke={2.2} />
            </button>
          </header>

          {/* Feed */}
          <div
            ref={feedRef}
            data-feed
            onScroll={(e) => onScroll(e.currentTarget, e.timeStamp)}
            className="hide-scrollbar h-full snap-y snap-mandatory overflow-y-auto"
          >
            {feed.map((dish, index) => {
              const inBasket = basket.some((x) => x.id === dish.id);
              const reviews = parseCount(dish.reviews);
              const likeCount =
                reviews * 6.3 + (liked.has(dish.id) ? 1 : 0);
              const saveCount =
                reviews * 0.9 + (saved.has(dish.id) ? 1 : 0);
              const isExpanded = expanded === dish.id;
              const soundLine = dish.reviewCreator
                ? `${dish.reviewCreator} · ${dish.reviewPlatform} review`
                : `Fresh from the kitchen · ${dish.restaurant}`;
              return (
                <section
                  key={dish.id}
                  className="relative h-full snap-start snap-always overflow-hidden bg-ink"
                >
                  <Media dish={dish} />
                  {/* Scrims: keep every line of text readable over bright food */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/60 to-transparent" />
                  <div
                    className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent transition-[height] ${isExpanded ? "h-[80%]" : "h-[62%]"}`}
                  />
                  {/* Double-tap to like */}
                  <div
                    className="absolute inset-0 z-[1]"
                    onDoubleClick={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      doubleTapLike(dish, e.clientX - r.left, e.clientY - r.top);
                    }}
                  />
                  {bursts
                    .filter((b) => b.dishId === dish.id)
                    .map((b) => (
                      <span
                        key={b.id}
                        className="heart-burst pointer-events-none absolute z-20 text-careem drop-shadow-xl"
                        style={{ left: b.x, top: b.y }}
                      >
                        <Icon name="heart" solid size={96} />
                      </span>
                    ))}

                  {index === 0 && hint && (
                    <div className="pop pointer-events-none absolute left-1/2 top-[38%] z-20 flex -translate-x-1/2 flex-col items-center gap-1 rounded-2xl bg-black/60 px-5 py-3 text-center backdrop-blur-md">
                      <span className="nudge text-careem">
                        <Icon name="chevronUp" size={28} stroke={2.6} />
                      </span>
                      <span className="text-[15px] font-semibold">
                        Swipe up for more
                      </span>
                      <span className="text-[13px] text-white/80">
                        Double-tap to love a dish
                      </span>
                    </div>
                  )}

                  {/* Right rail */}
                  <div className="absolute bottom-4 right-2 z-10 flex w-16 flex-col items-center gap-4">
                    <div className="relative mb-2">
                      <img
                        src={dish.imageUrl}
                        alt={dish.restaurant}
                        className="h-12 w-12 rounded-full border-2 border-white object-cover"
                      />
                      <button
                        aria-label={
                          following.has(dish.restaurant)
                            ? `Unfollow ${dish.restaurant}`
                            : `Follow ${dish.restaurant}`
                        }
                        onClick={() => {
                          const yes = !following.has(dish.restaurant);
                          toggle(setFollowing, dish.restaurant);
                          if (yes) flash(`Following ${dish.restaurant}`);
                        }}
                        className={`absolute -bottom-2.5 left-1/2 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full ${following.has(dish.restaurant) ? "bg-white text-careem-deep" : "bg-careem text-ink"}`}
                      >
                        <Icon
                          name={following.has(dish.restaurant) ? "check" : "plus"}
                          size={14}
                          stroke={3.2}
                        />
                      </button>
                    </div>
                    <RailButton
                      label={liked.has(dish.id) ? "Unlike" : "Love"}
                      icon="heart"
                      count={formatCount(likeCount)}
                      active={liked.has(dish.id)}
                      onClick={() => like(dish)}
                    />
                    <RailButton
                      label="Reviews"
                      icon="comment"
                      count={dish.reviews.toUpperCase()}
                      onClick={() => open("reviews", dish)}
                    />
                    <RailButton
                      label={saved.has(dish.id) ? "Unsave" : "Save"}
                      icon="bookmark"
                      count={formatCount(saveCount)}
                      active={saved.has(dish.id)}
                      activeClass="text-[#ffc83d]"
                      onClick={() => {
                        const yes = !saved.has(dish.id);
                        toggle(setSaved, dish.id);
                        learn(dish, yes ? "save" : "unsave");
                        if (yes) flash("Saved to your collection");
                      }}
                    />
                    <RailButton
                      label="Share"
                      icon="share"
                      count="Share"
                      onClick={() => open("share", dish)}
                    />
                    <span
                      aria-hidden
                      className="disc mt-1 grid h-11 w-11 place-items-center rounded-full bg-[conic-gradient(#222,#444,#222,#444,#222)] p-2"
                    >
                      <img
                        src={dish.imageUrl}
                        alt=""
                        className="h-full w-full rounded-full object-cover"
                      />
                    </span>
                  </div>

                  {/* Caption */}
                  <div className="text-shadow absolute bottom-4 left-3 right-[80px] z-10">
                    <button
                      onClick={() => flash(tasteReason(dish, profile))}
                      className="mb-2.5 inline-flex items-center gap-1.5 rounded-md bg-black/45 px-2 py-1 text-[13px] font-semibold text-careem backdrop-blur-md [text-shadow:none]"
                    >
                      <Icon name="spark" size={14} />
                      {tasteScore(dish, profile)}% match for you
                    </button>

                    {/* Order anchor (TikTok Shop-style) */}
                    <div className="mb-3 flex items-center gap-2.5 rounded-xl bg-white p-1.5 pr-1.5 text-ink shadow-lg [text-shadow:none]">
                      <img
                        src={dish.imageUrl}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold leading-5">
                          {dish.name}
                        </p>
                        <p className="text-[13px] leading-5 text-ink/65">
                          <strong className="font-bold text-ink">
                            AED {dish.price}
                          </strong>{" "}
                          · {dish.deliveryMinutes} min
                        </p>
                      </div>
                      <button
                        onClick={() => add(dish)}
                        className={`flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-[14px] font-bold transition active:scale-95 ${inBasket ? "bg-careem-soft text-careem-deep" : "bg-careem text-ink"}`}
                      >
                        <Icon name={inBasket ? "check" : "bag"} size={17} stroke={2.4} />
                        {inBasket ? "Added" : "Add"}
                      </button>
                    </div>

                    <p className="flex items-center gap-1.5 text-[17px] font-bold leading-6">
                      {dish.restaurant}
                      <span
                        title="On Careem"
                        className="grid h-4 w-4 place-items-center rounded-full bg-careem text-ink"
                      >
                        <Icon name="check" size={11} stroke={3.5} />
                      </span>
                      <span className="text-[14px] font-medium text-white/85">
                        · <span className="text-[#ffd54a]">★</span>{" "}
                        {dish.rating}
                      </span>
                    </p>
                    <button
                      onClick={() =>
                        setExpanded(isExpanded ? null : dish.id)
                      }
                      className="mt-1 block w-full text-left text-[15px] leading-[21px] text-white"
                    >
                      <span className={isExpanded ? "" : "line-clamp-2"}>
                        {dish.description}{" "}
                        <span className="font-semibold">
                          {dish.tags.map(hashtag).join(" ")}
                        </span>
                      </span>
                      <span className="font-semibold text-white/80">
                        {isExpanded ? " less" : ""}
                      </span>
                    </button>
                    {!isExpanded && (
                      <button
                        onClick={() => setExpanded(dish.id)}
                        className="text-[15px] font-semibold text-white/85"
                      >
                        more
                      </button>
                    )}
                    <a
                      href={dish.reviewUrl}
                      target={dish.reviewUrl ? "_blank" : undefined}
                      rel="noreferrer"
                      onClick={(e) => !dish.reviewUrl && e.preventDefault()}
                      className="mt-2 flex items-center gap-2 text-[14px] font-medium"
                    >
                      <Icon name="play" solid size={14} />
                      <span className="marquee w-44">
                        <span>
                          <span>{soundLine}</span>
                          <span>{soundLine}</span>
                        </span>
                      </span>
                    </a>
                  </div>

                  {/* Playback progress */}
                  <div className="absolute inset-x-0 bottom-0 z-10 h-[2px] bg-white/20">
                    {index === activeIndex && (
                      <div className="progress h-full bg-white/90" />
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          {toast && (
            <div
              role="status"
              className="pop absolute left-1/2 top-[30%] z-50 w-max max-w-[80%] -translate-x-1/2 rounded-lg bg-black/80 px-4 py-2.5 text-center text-[15px] font-semibold text-white backdrop-blur-md"
            >
              {toast}
            </div>
          )}
        </div>

        {/* Bottom tab bar */}
        <nav className="safe-bottom relative z-40 flex shrink-0 items-center justify-around border-t border-white/10 bg-black pt-1.5">
          {navItem("Home", "home", panel === null)}
          {navItem("Find", "camera", panel === "camera", () =>
            open("camera"),
          )}
          <button
            aria-label={`Basket, ${basket.length} item${basket.length === 1 ? "" : "s"}`}
            onClick={() => open("basket")}
            className="relative mb-3 mt-1"
          >
            <span className="create-btn">
              <span>
                <Icon name="bag" size={19} stroke={2.4} />
              </span>
            </span>
            {basket.length > 0 && (
              <span className="pop absolute -right-2.5 -top-2 z-10 grid h-5 min-w-5 place-items-center rounded-full bg-careem px-1 text-[11px] font-bold text-ink ring-2 ring-black">
                {basket.length}
              </span>
            )}
          </button>
          {navItem("Together", "users", panel === "room", () => open("room"))}
          {navItem("Taste", "spark", panel === "profile", () =>
            open("profile"),
          )}
        </nav>

        {/* Bottom sheets */}
        {panel && (
          <div
            className="absolute inset-0 z-50 bg-black/50"
            onClick={close}
          >
            <aside
              role="dialog"
              aria-label={panelTitles[panel][0]}
              onClick={(e) => e.stopPropagation()}
              className="sheet absolute inset-x-0 bottom-0 max-h-[85%] overflow-auto rounded-t-2xl bg-white px-5 pb-9 pt-2 text-ink shadow-2xl"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/15" />
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold text-careem-deep">
                    {panelTitles[panel][0]}
                  </p>
                  <h2 className="text-[22px] font-bold leading-tight">
                    {panel === "reviews" && panelDish
                      ? `${panelDish.reviews} reviews`
                      : panel === "share" && panelDish
                        ? panelDish.name
                        : panelTitles[panel][1]}
                  </h2>
                </div>
                <button
                  aria-label="Close"
                  onClick={close}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mist"
                >
                  <Icon name="close" size={18} />
                </button>
              </div>

              {panel === "share" && panelDish && (
                <div className="grid grid-cols-4 gap-2 text-center">
                  <ShareOption
                    label="Copy link"
                    icon="link"
                    tone="bg-careem text-ink"
                    onClick={() => {
                      navigator.clipboard?.writeText(location.href);
                      close();
                      flash("Link copied");
                    }}
                  />
                  <ShareOption
                    label="Order together"
                    icon="users"
                    tone="bg-[#5844d8] text-white"
                    onClick={() => open("room")}
                  />
                  <ShareOption
                    label="Add to basket"
                    icon="bag"
                    tone="bg-ink text-white"
                    onClick={() => {
                      add(panelDish);
                      close();
                    }}
                  />
                  <ShareOption
                    label="Not interested"
                    icon="eyeOff"
                    tone="bg-mist text-ink"
                    onClick={() => {
                      close();
                      skip(panelDish);
                      flash("We'll show fewer like this");
                    }}
                  />
                </div>
              )}

              {panel === "reviews" && panelDish && (
                <div>
                  <div className="flex items-center gap-4 rounded-2xl bg-mist p-4">
                    <p className="text-[40px] font-bold leading-none">
                      {panelDish.rating}
                    </p>
                    <div>
                      <p className="flex text-[#f5b301]">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <Icon key={i} name="star" solid size={18} />
                        ))}
                      </p>
                      <p className="mt-1 text-[14px] text-ink/65">
                        {panelDish.reviews} ratings for {panelDish.restaurant}{" "}
                        on Careem
                      </p>
                    </div>
                  </div>
                  {panelDish.reviewUrl ? (
                    <a
                      href={panelDish.reviewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 flex items-center gap-3 rounded-2xl border border-ink/10 p-4"
                    >
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-white">
                        <Icon name="play" solid size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold">
                          {panelDish.reviewCreator}
                        </span>
                        <span className="block text-[13px] text-ink/60">
                          Watch the full review on {panelDish.reviewPlatform}
                        </span>
                      </span>
                      <span className="text-careem-deep">↗</span>
                    </a>
                  ) : (
                    <p className="mt-4 text-[15px] text-ink/65">
                      No creator reviews yet for this dish.
                    </p>
                  )}
                  <PrimaryButton
                    className="mt-5"
                    onClick={() => {
                      add(panelDish);
                      close();
                    }}
                  >
                    <Icon name="bag" size={19} />
                    Add · AED {panelDish.price}
                  </PrimaryButton>
                </div>
              )}

              {panel === "camera" && (
                <div>
                  {upload ? (
                    <div className="space-y-4">
                      <img
                        src={upload}
                        alt="Uploaded food"
                        className="h-48 w-full rounded-2xl object-cover"
                      />
                      <div className="rounded-2xl bg-careem-soft p-4">
                        <p className="text-[13px] font-bold text-careem-deep">
                          VISUAL MATCH · 94%
                        </p>
                        <p className="mt-1 text-lg font-bold">
                          Spicy Salmon Crunch
                        </p>
                        <p className="text-[15px] text-ink/65">
                          3 nearby matches on Careem · from AED 42
                        </p>
                      </div>
                      <PrimaryButton
                        onClick={() => {
                          close();
                          feedRef.current?.children[2]?.scrollIntoView({
                            behavior: "smooth",
                          });
                        }}
                      >
                        Show similar dishes
                      </PrimaryButton>
                    </div>
                  ) : (
                    <label className="grid h-52 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-ink/15 bg-mist text-center">
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
                        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-careem text-ink">
                          <Icon name="camera" />
                        </span>
                        <strong className="text-[16px]">
                          Upload a food screenshot
                        </strong>
                        <small className="mt-1 block text-[14px] text-ink/60">
                          We&apos;ll find similar dishes nearby
                        </small>
                      </span>
                    </label>
                  )}
                </div>
              )}

              {panel === "chat" && (
                <div>
                  <div className="mb-4 rounded-2xl bg-mist p-4 text-[15px] leading-6 text-ink/75">
                    I can search by craving, budget, dietary needs or delivery
                    time — without replacing your feed.
                  </div>
                  {reply && (
                    <div className="pop mb-4 rounded-2xl bg-careem-soft p-4 text-[15px] leading-6">
                      {reply}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <textarea
                      value={chat}
                      onChange={(e) => setChat(e.target.value)}
                      rows={2}
                      className="min-w-0 flex-1 resize-none rounded-xl border border-ink/10 bg-mist p-3 text-[15px] outline-none focus:border-careem-deep"
                    />
                    <button
                      aria-label="Send"
                      onClick={ask}
                      disabled={chatting}
                      className="grid w-12 place-items-center rounded-xl bg-careem text-ink disabled:opacity-40"
                    >
                      <Icon name="send" size={20} />
                    </button>
                  </div>
                </div>
              )}

              {panel === "room" && (
                <TogetherPanel
                  baseDish={initialDishes[0]}
                  onCreateCart={async (items) => {
                    try {
                      await prepareGroupBasket(items);
                    } catch (error) {
                      flash(
                        error instanceof Error
                          ? error.message
                          : "Could not prepare the group basket",
                      );
                    }
                  }}
                />
              )}

              {panel === "profile" && (
                <div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-mist p-4">
                      <p className="text-[13px] text-ink/60">Usually spend</p>
                      <p className="mt-1 text-2xl font-bold">AED 42</p>
                      <p className="text-[13px] font-semibold text-careem-deep">
                        Arabic food
                      </p>
                    </div>
                    <div className="rounded-2xl bg-mist p-4">
                      <p className="text-[13px] text-ink/60">Top taste</p>
                      <p className="mt-1 text-2xl font-bold">Italian</p>
                      <p className="text-[13px] font-semibold text-careem-deep">
                        +18% affinity
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-3 rounded-2xl bg-careem-soft p-4">
                    <span className="text-careem-deep">
                      <Icon name="spark" />
                    </span>
                    <div>
                      <p className="font-bold">Why your feed looks like this</p>
                      <p className="mt-1 text-[15px] leading-6 text-ink/70">
                        Order history sets a budget per cuisine. Likes, saves,
                        skips and watch time continuously re-rank what comes
                        next.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {panel === "basket" && (
                <div>
                  {basket.length === 0 ? (
                    <p className="py-8 text-center text-[15px] text-ink/60">
                      Add a dish that makes you stop scrolling.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {basket.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-xl bg-mist p-2"
                        >
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-semibold">
                              {item.name}
                            </p>
                            <p className="text-[13px] text-ink/60">
                              {item.restaurant}
                            </p>
                          </div>
                          <span className="pr-2 text-[15px] font-bold">
                            AED {item.price}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-5 flex items-center justify-between gap-4 border-t border-ink/10 pt-4">
                    <div>
                      <p className="text-[13px] text-ink/60">Subtotal</p>
                      <p className="text-2xl font-bold">AED {total}</p>
                    </div>
                    <button
                      disabled={!basket.length}
                      onClick={() => {
                        if (!groupPlan)
                          return flash(
                            "Together creates the group contribution flow",
                          );
                        setSplit(true);
                      }}
                      className="flex h-12 items-center gap-2 rounded-xl bg-careem px-5 font-bold text-ink disabled:opacity-35"
                    >
                      <Icon name="card" size={18} />
                      Vote on contributions
                    </button>
                  </div>
                  {split && (
                    <SplitVote
                      basket={basket}
                      total={total}
                      onComplete={commitGroupBasket}
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
