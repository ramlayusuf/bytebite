"use client";
/* eslint-disable @next/next/no-img-element -- dish images are plain files served from /public. */

import { useRef, useState } from "react";
import type { Dish } from "@/types/dish";
import { Icon } from "./icon";

export function TogetherPanel({
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
          <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#102019] bg-[#5844d8] font-bold">
            R
          </span>
          <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#102019] bg-[#ef755b] font-bold">
            M
          </span>
          <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#102019] bg-white/10 text-white/40">
            +3
          </span>
        </div>
        <p className="mb-5 text-[12px] leading-6 text-white/60">
          Everyone swipes privately. A match happens when the group chooses
          dishes from the same restaurant.
        </p>
        <button
          onClick={() => setRoom(true)}
          className="w-full rounded-xl bg-[#2de3a1] py-3 font-bold text-[#07110d]"
        >
          Create room · BYTE42
        </button>
      </div>
    );

  if (matched)
    return (
      <div>
        <div className="text-center">
          <p className="text-[10.5px] font-bold text-[#2de3a1]">RESTAURANT MATCH</p>
          <h3 className="mt-1 text-[20px] font-bold">
            Everyone chose Eleven Green
          </h3>
          <p className="mt-2 text-[12px] text-white/55">
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
                <p className="truncate text-[12px] font-bold">{dish.name}</p>
                <p className="text-[10.5px] text-white/45">
                  {["You", "Reem", "Mohammed"][index]} · AED {dish.price}
                </p>
              </div>
              <span className="text-[#2de3a1]">✓</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => onCreateCart(choices)}
          className="mt-5 w-full rounded-xl bg-[#2de3a1] py-3 font-bold text-[#07110d]"
        >
          Create shared cart · AED{" "}
          {choices.reduce((sum, dish) => sum + dish.price, 0)}
        </button>
      </div>
    );

  const dish = choices[card];
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-[10.5px]">
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
          <p className="text-[10.5px] font-bold text-[#2de3a1]">{dish.restaurant}</p>
          <h3 className="text-[20px] font-bold">{dish.name}</h3>
          <p className="mt-1 text-[12px] text-white/65">
            AED {dish.price}
          </p>
        </div>
        {(motion || Math.abs(dragX) > 35) && (
          <span
            className={`absolute top-5 rounded-lg border-4 px-3 py-1 text-[20px] font-bold ${motion === "yes" || (!motion && dragX > 0) ? "left-5 -rotate-12 border-[#2de3a1] text-[#2de3a1]" : "right-5 rotate-12 border-red-400 text-red-400"}`}
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
      <p className="mt-3 text-center text-[10.5px] text-white/40">
        Swipe privately · friends cannot see your votes
      </p>
    </div>
  );
}

type SplitChoice = "equal" | "dish";

export function SplitVote({
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
      <p className="text-[10.5px] font-bold text-[#087f5b]">GROUP VOTE</p>
      <h3 className="mt-1 text-[15px] font-bold">How should we split it?</h3>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => castVote("equal")}
          className={`rounded-xl border p-3 text-left ${votes.You === "equal" ? "border-[#087f5b] bg-[#e6fff5]" : "border-black/10"}`}
        >
          <strong className="block text-[12px]">Split equally</strong>
          <span className="text-[10.5px] text-black/50">
            AED {(total / 3).toFixed(2)} each
          </span>
          <span className="mt-2 block text-[10.5px] font-bold text-[#087f5b]">
            {equalVotes} vote{equalVotes === 1 ? "" : "s"}
          </span>
        </button>
        <button
          onClick={() => castVote("dish")}
          className={`rounded-xl border p-3 text-left ${votes.You === "dish" ? "border-[#087f5b] bg-[#e6fff5]" : "border-black/10"}`}
        >
          <strong className="block text-[12px]">By chosen dish</strong>
          <span className="text-[10.5px] text-black/50">
            Everyone pays their item
          </span>
          <span className="mt-2 block text-[10.5px] font-bold text-[#087f5b]">
            {dishVotes} vote{dishVotes === 1 ? "" : "s"}
          </span>
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {members.map((member, index) => (
          <div
            key={member}
            className="flex items-center justify-between text-[12px]"
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
          <p className="text-[10.5px] font-bold text-[#087f5b]">UNANIMOUS DECISION</p>
          <p className="text-[12px] font-bold">
            {unanimous === "equal"
              ? "Split the cart equally"
              : "Pay for each chosen dish"}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-center text-[10.5px] text-black/45">
          Payment unlocks when all three agree.
        </p>
      )}
      <button
        disabled={!unanimous}
        onClick={onComplete}
        className="mt-4 w-full rounded-xl bg-[#07110d] py-3 font-bold text-white disabled:opacity-25"
      >
        Confirm split & send payment links
      </button>
    </div>
  );
}
