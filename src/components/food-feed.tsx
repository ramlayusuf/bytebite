"use client";
/* eslint-disable @next/next/no-img-element -- media comes from TikTok, uploads and local files, not next/image. */

import { useEffect, useMemo, useRef, useState } from "react";
import type { Cuisine, Dish } from "@/types/dish";
import { reviews as sampleReviews, type Review } from "@/data/reviews";
import { applyTasteSignal, emptyTasteProfile, rankDishes, type TasteProfile, type TasteSignal } from "@/lib/recommendations";
import { Icon, type IconName } from "./icon";
import { SplitVote, TogetherPanel } from "./group-order";

type Panel = "basket" | "hitlist" | "search" | "camera" | "room" | "reviews" | "friends" | "chat" | "upload" | null;
type Mode = "following" | "for-you";
type Flight = { id: number; x: number; y: number; dx: number; dy: number; img?: string; emoji?: string };
type ChatMsg = { role: "user" | "assistant"; content: string; tools?: string[]; dishIds?: string[]; mode?: string };
type UploadMeta = {
  id: string;
  hasPoster: boolean;
  uploaderType: "restaurant" | "customer";
  restaurant: string;
  dish: string;
  price: number;
  cuisine: Cuisine;
  description: string;
  ingredients: string[];
  items?: { name: string; price: number }[];
  uploaderName?: string;
};

/* ---------- small helpers ---------- */

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
const handleOf = (d: Dish) => "@" + (d.creatorHandle ?? slug(d.restaurant));
const ownAccount = (d: Dish) => d.uploadedBy === "restaurant" || (!!d.creatorHandle && d.creatorHandle === d.restaurantHandle);
/* one dish out of a video that shows several: its own bag entry with its own name and price */
const itemDish = (d: Dish, it: { name: string; price: number }, i: number): Dish => ({
  ...d,
  id: `${d.id}#${i}`,
  name: it.name,
  price: it.price,
  items: undefined,
});
const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}K` : String(n);
const hueOf = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);
const emojiOf = (d: Dish) =>
  (({ pizza: "🍕", burger: "🍔", sushi: "🍣", pasta: "🍝", shawarma: "🥙", biryani: "🍛", kunafa: "🍮", udon: "🍜", ramen: "🍜", ethiopian: "🥘", chinese: "🥡", saj: "🥙", "truffle-pizza": "🍕", "shawarma-pizza": "🍕", satay: "🍢" }) as Record<string, string>)[d.id] ?? "🍽️";
const CUISINE_OPTIONS: Cuisine[] = ["Burgers", "Arabic", "Japanese", "Italian", "Asian", "Indian", "Dessert", "Other"];

const toDish = (u: UploadMeta): Dish => ({
  id: `up-${u.id}`,
  uploadId: u.id,
  uploadedBy: u.uploaderType,
  name: u.dish,
  restaurant: u.restaurant,
  cuisine: u.cuisine,
  price: u.price,
  items: u.items && u.items.length > 1 ? u.items : undefined,
  description: u.description || `${u.dish} from ${u.restaurant}.`,
  tags: [u.uploaderType === "restaurant" ? "Posted by the restaurant" : "Posted by a customer"],
  ingredients: u.ingredients,
  gridPosition: "0% 0%",
  match: 85,
  imageUrl: u.hasPoster ? `/api/uploads/${u.id}/poster` : undefined,
  videoUrl: `/api/uploads/${u.id}/video`,
  creatorHandle: slug(u.uploaderType === "restaurant" ? u.restaurant : u.uploaderName || "customer") || "crave",
  restaurantHandle: u.uploaderType === "restaurant" ? slug(u.restaurant) : undefined,
});

/* grab a still frame from a chosen video to use as its thumbnail */
function makePoster(url: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = url;
    const finish = (blob: Blob | null) => {
      clearTimeout(timer);
      v.removeAttribute("src");
      v.load();
      resolve(blob);
    };
    const timer = setTimeout(() => finish(null), 6000);
    v.onloadeddata = () => {
      v.currentTime = Math.min(1, (v.duration || 2) / 2);
    };
    v.onseeked = () => {
      const w = Math.min(480, v.videoWidth || 480);
      const h = Math.round((w * (v.videoHeight || 640)) / (v.videoWidth || 480));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return finish(null);
      ctx.drawImage(v, 0, 0, w, h);
      canvas.toBlob((b) => finish(b), "image/jpeg", 0.8);
    };
    v.onerror = () => finish(null);
  });
}

/* Prototype data: friend activity per dish (Bitesight-style social proof). */
const friendActivity: Record<string, { name: string; when: string; stars: number }[]> = {
  burger: [{ name: "Reem", when: "2 days ago", stars: 5 }],
  shawarma: [
    { name: "Mohammed", when: "Yesterday", stars: 5 },
    { name: "Reem", when: "1 week ago", stars: 4 },
  ],
  sushi: [{ name: "Reem", when: "3 days ago", stars: 5 }],
  pizza: [
    { name: "Reem", when: "Yesterday", stars: 5 },
    { name: "Mohammed", when: "2 weeks ago", stars: 5 },
  ],
  kunafa: [{ name: "Mohammed", when: "4 days ago", stars: 5 }],
};
const friendColor: Record<string, string> = { Reem: "#5844d8", Mohammed: "#ef755b" };

/* Bitesight-style intent search: craving chips instead of category lists. */
const cravings: { label: string; test: (d: Dish) => boolean }[] = [
  { label: "Something cheesy", test: (d) => /chees|mozzarella|parmesan|cheddar/i.test(`${d.description} ${(d.ingredients ?? []).join(" ")}`) },
  { label: "Healthy lunch", test: (d) => ["Japanese", "Arabic", "Asian"].includes(d.cuisine) },
  { label: "Under AED 45", test: (d) => d.price <= 45 },
  { label: "Sweet tooth", test: (d) => d.cuisine === "Dessert" },
  { label: "Comfort food", test: (d) => ["Burgers", "Italian", "Indian"].includes(d.cuisine) },
];
const chatSuggestions = ["What's good for AED 45?", "I want something cheesy in 25 minutes", "Chicken under AED 50"];

const panelTitle: Record<Exclude<Panel, null>, string> = {
  basket: "Your bag",
  hitlist: "Your hit list",
  search: "What are you craving?",
  camera: "See it. Find it.",
  room: "Eat together",
  reviews: "Reviews",
  friends: "Who ordered this",
  chat: "Ask Crave",
  upload: "Share a dish",
};

/* ---------- pieces ---------- */

const TIKTOK_PARAMS =
  "controls=0&autoplay=1&loop=1&muted=1&music_info=0&description=0&rel=0&native_context_menu=0&closed_caption=0&play_button=0&progress_bar=0&volume_control=0&fullscreen_button=0&timestamp=0";

function Media({
  dish,
  live,
  sound,
  failed,
  frameRef,
  videoRef,
  onFrameLoad,
  onProgress,
}: {
  dish: Dish;
  live: boolean;
  sound: boolean;
  failed: boolean;
  frameRef: React.RefObject<HTMLIFrameElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onFrameLoad: () => void;
  onProgress: (t: number, d: number) => void;
}) {
  const poster = dish.imageUrl ? (
    <img src={dish.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
  ) : (
    <div className="absolute inset-0 bg-[#0b1a13]" />
  );
  if (dish.tiktokId)
    return (
      <>
        <div className="tt-cover">
          <div className="tt-frame">
          {dish.imageUrl && <img src={dish.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          {live && !failed && (
            <iframe
              ref={frameRef}
              onLoad={onFrameLoad}
              src={`https://www.tiktok.com/player/v1/${dish.tiktokId}?${TIKTOK_PARAMS}`}
              title={`${dish.name} on TikTok`}
              allow="autoplay; encrypted-media; picture-in-picture"
              className="pointer-events-none absolute inset-0 h-full w-full border-0"
            />
          )}
          </div>
        </div>
        {live && failed && (
          <div className="absolute left-1/2 top-[44%] z-10 w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-black/70 p-4 text-center backdrop-blur-md">
            <p className="text-[12px] font-bold">TikTok won&apos;t play this video here</p>
            <p className="mt-1 text-[10.5px] text-white/60">It may be private or removed, or embedding is turned off.</p>
            {dish.reviewUrl && (
              <a
                href={dish.reviewUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block rounded-full bg-white px-4 py-2 text-[10.5px] font-bold text-[#062a1c]"
              >
                Watch on TikTok ↗
              </a>
            )}
          </div>
        )}
      </>
    );
  if (dish.videoUrl)
    return (
      <>
        {poster}
        {live && (
          <video
            ref={videoRef}
            src={dish.videoUrl}
            poster={dish.imageUrl}
            autoPlay
            loop
            playsInline
            muted={!sound}
            onTimeUpdate={(e) => onProgress(e.currentTarget.currentTime, e.currentTarget.duration)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </>
    );
  if (dish.imageUrl) return <img src={dish.imageUrl} alt="" className="food-clip absolute inset-0 h-full w-full object-cover" />;
  return (
    <div role="img" aria-label={dish.name} className="dish-photo absolute inset-0" style={{ backgroundPosition: dish.gridPosition }} />
  );
}

function RailButton({
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
      className="pointer-events-auto flex flex-col items-center gap-0.5 text-[9px] font-bold text-white"
      style={{ textShadow: "0 1px 6px rgba(0,0,0,.6)" }}
    >
      <span
        className="grid h-9 w-9 place-items-center transition active:scale-75"
        style={{ color: active ? "#2de3a1" : "#fff", filter: "drop-shadow(0 1px 4px rgba(0,0,0,.55))" }}
      >
        <Icon name={icon} filled={active} size={27} />
      </span>
      {label}
    </button>
  );
}

function MenuRow({ icon, title, sub, onClick }: { icon: IconName; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl p-3 text-left active:bg-white/10">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-white/10">
        <Icon name={icon} size={19} />
      </span>
      <span>
        <strong className="block text-[13px]">{title}</strong>
        <small className="text-white/50">{sub}</small>
      </span>
    </button>
  );
}

function Sheet({
  title,
  onClose,
  light = false,
  children,
}: {
  title: string;
  onClose: () => void;
  light?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-50 bg-black/60" onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className={`sheet absolute inset-x-0 bottom-0 max-h-[88%] overflow-auto rounded-t-[20px] px-4 pb-8 pt-2 shadow-2xl ${light ? "bg-white text-[#0b2230]" : "bg-[#102019]"}`}
      >
        <div className={`mx-auto mb-2 h-1 w-9 rounded-full ${light ? "bg-[#0b2230]/15" : "bg-white/20"}`} />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-bold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className={`grid h-8 w-8 place-items-center rounded-full ${light ? "bg-[#eaf2f8]" : "bg-white/10"}`}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

const lightInput =
  "h-10 w-full min-w-0 rounded-lg bg-[#eef4f9] px-3 text-[12px] text-[#0b2230] outline-none placeholder:text-[#8aa0b2] focus:ring-2 focus:ring-[#4cc9f0]/50";
const inputClass = "h-10 w-full min-w-0 rounded-lg bg-white/10 px-3 text-[12px] outline-none placeholder:text-white/35";

/* ---------- the feed ---------- */

export function FoodFeed({ initialDishes }: { initialDishes: Dish[] }) {
  const [feed, setFeed] = useState(initialDishes);
  const [uploads, setUploads] = useState<Dish[]>([]);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<TasteProfile>(emptyTasteProfile);
  const [loaded, setLoaded] = useState(false);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [basket, setBasket] = useState<Dish[]>([]);
  const [follows, setFollows] = useState<Set<string>>(
    () => new Set(initialDishes.filter(ownAccount).map(handleOf)),
  );
  const [mode, setMode] = useState<Mode>("for-you");
  const [results, setResults] = useState<{ label: string; dishes: Dish[] } | null>(null);
  const [current, setCurrent] = useState(0);
  const [clean, setClean] = useState(false);
  const [hint, setHint] = useState(false);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(false);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number; r: number }[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [bump, setBump] = useState(false);
  const [toast, setToast] = useState("");
  const [openItems, setOpenItems] = useState<string | null>(null);
  const [progress, setProgress] = useState({ t: 0, d: 0 });
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [panel, setPanel] = useState<Panel>(null);
  const [menuDish, setMenuDish] = useState<Dish | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewFor, setReviewFor] = useState<Dish | null>(null);
  const [friendsFor, setFriendsFor] = useState<Dish | null>(null);
  const [myReviews, setMyReviews] = useState<Record<string, Review[]>>({});
  const [draft, setDraft] = useState("");
  const [draftRating, setDraftRating] = useState(5);
  const [query, setQuery] = useState("");
  const [upload, setUpload] = useState("");
  const [split, setSplit] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [form, setForm] = useState({
    type: "restaurant" as "restaurant" | "customer",
    restaurant: "",
    cuisine: "Other" as Cuisine,
    description: "",
    ingredients: "",
    name: "",
  });
  const [upItems, setUpItems] = useState<{ name: string; price: string }[]>([{ name: "", price: "" }]);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState("");
  const [poster, setPoster] = useState<Blob | null>(null);
  const [posting, setPosting] = useState(false);
  const [formError, setFormError] = useState("");

  const screenRef = useRef<HTMLElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bagRef = useRef<HTMLButtonElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const active = useRef(0);
  const viewAt = useRef(0);
  const profileRef = useRef(profile);
  const hiddenRef = useRef(hidden);
  const cleanRef = useRef(false);
  const currentIdRef = useRef("");
  const retriedRef = useRef("");
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStart = useRef({ x: 0, y: 0 });
  const longPressed = useRef(false);
  const idCounter = useRef(0);
  const clientIdRef = useRef("");

  const catalog = useMemo(() => [...uploads, ...initialDishes], [uploads, initialDishes]);
  const total = useMemo(() => basket.reduce((s, x) => s + x.price, 0), [basket]);

  /* restore the taste profile, follows, hidden dishes, reviews and upload tokens; then load uploads */
  useEffect(() => {
    viewAt.current = performance.now();
    const id = setTimeout(() => {
      try {
        const raw = localStorage.getItem("crave-taste-profile");
        const hid = new Set<string>(JSON.parse(localStorage.getItem("crave-hidden") ?? "[]"));
        hiddenRef.current = hid;
        if (raw) {
          const restored = { ...emptyTasteProfile(), ...JSON.parse(raw) } as TasteProfile;
          profileRef.current = restored;
          setProfile(restored);
          setLiked(new Set(restored.liked));
          setSaved(new Set(restored.saved));
          setFeed(rankDishes(initialDishes.filter((d) => !hid.has(d.id)), restored));
        } else if (hid.size) setFeed(initialDishes.filter((d) => !hid.has(d.id)));
        setHidden(hid);
        const f = localStorage.getItem("crave-follows");
        if (f) setFollows(new Set(JSON.parse(f) as string[]));
        const r = localStorage.getItem("crave-my-reviews");
        if (r) setMyReviews(JSON.parse(r));
        const t = localStorage.getItem("crave-upload-tokens");
        if (t) setTokens(JSON.parse(t));
      } catch {}
      try {
        let c = localStorage.getItem("crave-client-id");
        if (!c) {
          c = Math.random().toString(36).slice(2) + Date.now().toString(36);
          localStorage.setItem("crave-client-id", c);
        }
        clientIdRef.current = c;
      } catch {}
      fetch("/api/likes", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: { counts?: Record<string, number> }) => setLikeCounts(d.counts ?? {}))
        .catch(() => {});
      setLoaded(true);
      fetch("/api/uploads", { cache: "no-store" })
        .then((r) => r.json())
        .then((data: { uploads?: UploadMeta[] }) => {
          const list = (data.uploads ?? []).map(toDish);
          if (!list.length) return;
          setUploads(list);
          setFeed((cur) => [
            ...list.filter((d) => !hiddenRef.current.has(d.id) && !cur.some((c) => c.id === d.id)),
            ...cur,
          ]);
        })
        .catch(() => {});
    }, 0);
    return () => clearTimeout(id);
  }, [initialDishes]);
  useEffect(() => {
    if (!loaded) return;
    hiddenRef.current = hidden;
    try {
      localStorage.setItem("crave-taste-profile", JSON.stringify(profile));
      localStorage.setItem("crave-follows", JSON.stringify([...follows]));
      localStorage.setItem("crave-hidden", JSON.stringify([...hidden]));
      localStorage.setItem("crave-my-reviews", JSON.stringify(myReviews));
      localStorage.setItem("crave-upload-tokens", JSON.stringify(tokens));
    } catch {}
  }, [profile, follows, hidden, myReviews, tokens, loaded]);

  useEffect(() => {
    currentIdRef.current = feed[current]?.id ?? "";
  }, [feed, current]);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "end" });
  }, [chat, chatBusy, panel]);

  /* messages from TikTok's embed player: ready, play state, errors */
  useEffect(() => {
    const send = (type: string) =>
      frameRef.current?.contentWindow?.postMessage({ type, "x-tiktok-player": true }, "*");
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== "https://www.tiktok.com") return;
      let data: { type?: string; value?: unknown } | null = null;
      try {
        data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {}
      if (!data?.type) return;
      if (data.type === "onPlayerReady") {
        send(sound ? "unMute" : "mute");
        send("play");
      } else if (data.type === "onCurrentTime") {
        const v = (data.value ?? data) as { currentTime?: number; duration?: number };
        if (typeof v.currentTime === "number" && typeof v.duration === "number" && v.duration > 0)
          setProgress({ t: v.currentTime, d: v.duration });
      } else if (data.type === "onStateChange") {
        if (data.value === 1) setPaused(false);
        else if (data.value === 2) setPaused(true);
      } else if (data.type === "onPlayerError") {
        const value = data.value as { errorCode?: number } | number | undefined;
        const code = typeof value === "object" ? value?.errorCode : value;
        if (code === 3002) {
          // autoplay was blocked: retry once muted, then leave the play mark for a tap
          const id = currentIdRef.current;
          if (retriedRef.current !== id) {
            retriedRef.current = id;
            send("mute");
            send("play");
          } else setPaused(true);
        } else {
          const id = currentIdRef.current;
          if (id) setFailed((s) => new Set(s).add(id));
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [sound]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 1800);
  };
  const tt = (type: string, value?: number) =>
    frameRef.current?.contentWindow?.postMessage({ type, ...(value === undefined ? {} : { value }), "x-tiktok-player": true }, "*");
  const setCleanMode = (value: boolean) => {
    cleanRef.current = value;
    setClean(value);
    if (value) {
      setHint(true);
      setTimeout(() => setHint(false), 1700);
    }
  };
  const openPanel = (p: Panel) => {
    if (cleanRef.current) {
      cleanRef.current = false;
      setClean(false);
    }
    setMenuDish(null);
    setPanel(p);
  };
  const close = () => {
    setPanel(null);
    setSplit(false);
  };

  /* click the line to jump to that point in the video */
  const seekFromClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!progress.d) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const to = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) * progress.d;
    setProgress({ t: to, d: progress.d });
    if (feed[current]?.tiktokId) tt("seekTo", to);
    if (videoRef.current) videoRef.current.currentTime = to;
  };
  const onFrameLoad = () => {
    setTimeout(() => {
      tt(sound ? "unMute" : "mute");
      tt("play");
    }, 900);
  };
  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    if (feed[current]?.tiktokId) tt(next ? "unMute" : "mute");
    if (videoRef.current) videoRef.current.muted = !next;
  };
  const togglePlay = () => {
    const next = !paused;
    setPaused(next);
    if (feed[current]?.tiktokId) tt(next ? "pause" : "play");
    const v = videoRef.current;
    if (v) {
      if (next) v.pause();
      else void v.play();
    }
  };

  /* rebuild the feed for a mode + filter, keeping what the profile has learned */
  const rebuild = (m: Mode, fol: Set<string>, hid: Set<string> = hidden) => {
    const source = catalog.filter(
      (d) => !hid.has(d.id) && (m === "for-you" || fol.has(handleOf(d))),
    );
    const list = rankDishes(source, profileRef.current);
    setFeed(list);
    active.current = 0;
    viewAt.current = 0;
    setCurrent(0);
    setPaused(false);
    setProgress({ t: 0, d: 0 });
    requestAnimationFrame(() => feedRef.current?.scrollTo({ top: 0 }));
    return list;
  };

  const learn = (dish: Dish, signal: TasteSignal, value = 0, preserve = active.current) => {
    const next = applyTasteSignal(profileRef.current, dish, signal, value);
    profileRef.current = next;
    setProfile(next);
    setFeed((cur) => [...cur.slice(0, preserve + 1), ...rankDishes(cur.slice(preserve + 1), next)]);
  };
  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) =>
    setter((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const love = (dish: Dish) => {
    const yes = !liked.has(dish.id);
    toggleSet(setLiked, dish.id);
    learn(dish, yes ? "like" : "unlike");
    setLikeCounts((c) => ({ ...c, [dish.id]: Math.max(0, (c[dish.id] ?? 0) + (yes ? 1 : -1)) }));
    fetch("/api/likes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dishId: dish.id, clientId: clientIdRef.current, liked: yes }),
    })
      .then((r) => r.json())
      .then((d: { count?: number }) => {
        if (typeof d.count === "number") setLikeCounts((c) => ({ ...c, [dish.id]: d.count as number }));
      })
      .catch(() => {});
    if (yes) flash(`More ${dish.cuisine} coming up`);
  };
  const save = (dish: Dish) => {
    const yes = !saved.has(dish.id);
    toggleSet(setSaved, dish.id);
    learn(dish, yes ? "save" : "unsave");
    flash(yes ? "Added to your hit list" : "Removed from hit list");
  };

  /* bag: add with a fly-to-bag animation, remove again from the card, hit list or bag */
  const addToBag = (dish: Dish, from?: HTMLElement) => {
    setBasket((x) => (x.some((i) => i.id === dish.id) ? x : [...x, dish]));
    learn(dish, "basket");
    flash(`${dish.name} added to bag`);
    setBump(true);
    setTimeout(() => setBump(false), 450);
    const screen = screenRef.current?.getBoundingClientRect();
    const a = from?.getBoundingClientRect();
    const b = bagRef.current?.getBoundingClientRect();
    if (screen && a && b) {
      const id = ++idCounter.current;
      const x = a.left + a.width / 2 - screen.left;
      const y = a.top + a.height / 2 - screen.top;
      setFlights((f) => [
        ...f,
        { id, x, y, dx: b.left + b.width / 2 - screen.left - x, dy: b.top + b.height / 2 - screen.top - y, img: dish.imageUrl, emoji: emojiOf(dish) },
      ]);
      setTimeout(() => setFlights((f) => f.filter((i) => i.id !== id)), 800);
    }
  };
  const removeFromBag = (dish: Dish) => {
    setBasket((x) => x.filter((i) => i.id !== dish.id));
    flash(`${dish.name} removed`);
  };
  const toggleBag = (dish: Dish, from?: HTMLElement) =>
    basket.some((i) => i.id === dish.id) ? removeFromBag(dish) : addToBag(dish, from);

  const toggleFollow = (dish: Dish) => {
    const h = handleOf(dish);
    const next = new Set(follows);
    if (next.has(h)) next.delete(h);
    else next.add(h);
    setFollows(next);
    flash(next.has(h) ? `Following ${h.slice(1)}` : `Unfollowed ${h.slice(1)}`);
  };

  /* long-press menu: "not interested" / "don't recommend" / delete own upload */
  const hideDishes = (dish: Dish, scope: "dish" | "restaurant") => {
    const ids = scope === "restaurant" ? catalog.filter((d) => d.restaurant === dish.restaurant) : [dish];
    const next = new Set(hidden);
    ids.forEach((d) => next.add(d.id));
    setHidden(next);
    learn(dish, "skip");
    setFeed((cur) => cur.filter((d) => !next.has(d.id)));
    setMenuDish(null);
    flash(scope === "restaurant" ? `We won't recommend ${dish.restaurant}` : "Got it — we'll show less like this");
  };
  const deleteUpload = async (dish: Dish) => {
    const token = dish.uploadId ? tokens[dish.uploadId] : undefined;
    if (!dish.uploadId || !token) return;
    setMenuDish(null);
    try {
      const r = await fetch(`/api/uploads/${dish.uploadId}`, { method: "DELETE", headers: { "x-delete-token": token } });
      if (!r.ok) throw new Error("Couldn't delete that video");
      setUploads((u) => u.filter((d) => d.id !== dish.id));
      setFeed((cur) => cur.filter((d) => d.id !== dish.id));
      setBasket((b) => b.filter((d) => d.id !== dish.id && !d.id.startsWith(`${dish.id}#`)));
      flash("Your video was deleted");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't delete that video");
    }
  };

  const onScroll = (el: HTMLDivElement, now: number) => {
    const next = Math.round(el.scrollTop / el.clientHeight);
    if (next === active.current) return;
    const previous = feed[active.current];
    const elapsed = viewAt.current ? now - viewAt.current : 0;
    if (previous) learn(previous, "dwell", elapsed, Math.max(active.current, next));
    active.current = next;
    viewAt.current = now;
    setCurrent(next);
    setPaused(false);
    setProgress({ t: 0, d: 0 });
    setOpenItems(null);
  };

  const isInteractive = (e: React.SyntheticEvent) =>
    !!(e.target as HTMLElement).closest("button,a,input,textarea,label,select,aside");

  /* Tap the video: single tap clears/restores the text, double tap loves, hold opens the menu. */
  /* one tap: bring the text back if it was cleared, otherwise play/pause the video */
  const singleTap = (dish: Dish) => {
    if (openItems) return setOpenItems(null);
    if (cleanRef.current) return setCleanMode(false);
    if ((dish.tiktokId || dish.videoUrl) && !failed.has(dish.id)) return togglePlay();
    setCleanMode(true);
  };
  const onTap = (dish: Dish, e: React.MouseEvent) => {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    if (isInteractive(e)) return;
    const rect = screenRef.current?.getBoundingClientRect();
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
      const id = ++idCounter.current;
      setHearts((h) => [
        ...h,
        { id, x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0), r: Math.random() * 30 - 15 },
      ]);
      setTimeout(() => setHearts((h) => h.filter((x) => x.id !== id)), 900);
      if (!liked.has(dish.id)) love(dish);
      return;
    }
    tapTimer.current = setTimeout(() => {
      tapTimer.current = null;
      singleTap(dish);
    }, 260);
  };
  const startPress = (dish: Dish, e: React.PointerEvent) => {
    if (isInteractive(e)) return;
    pressStart.current = { x: e.clientX, y: e.clientY };
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      pressTimer.current = null;
      longPressed.current = true;
      if (tapTimer.current) {
        clearTimeout(tapTimer.current);
        tapTimer.current = null;
      }
      navigator.vibrate?.(15);
      setMenuDish(dish);
    }, 550);
  };
  const movePress = (e: React.PointerEvent) => {
    if (!pressTimer.current) return;
    if (Math.hypot(e.clientX - pressStart.current.x, e.clientY - pressStart.current.y) > 10) cancelPress();
  };
  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  /* search: recommendations are listed in the sheet; the feed itself is never filtered */
  const showResults = (label: string, test: (d: Dish) => boolean) => {
    const list = catalog.filter((d) => !hidden.has(d.id) && test(d)).sort((a, b) => b.match - a.match);
    setResults({ label, dishes: list });
  };
  const submitQuery = () => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return;
    showResults(query.trim(), (d) => {
      const hay = [d.name, d.restaurant, d.cuisine, d.description, ...d.tags, ...(d.ingredients ?? [])].join(" ").toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  };
  const jumpTo = (dish: Dish) => {
    close();
    let idx = feed.findIndex((d) => d.id === dish.id);
    if (idx >= 0) {
      setTimeout(() => feedRef.current?.children[idx]?.scrollIntoView({ behavior: "smooth" }), 60);
      return;
    }
    setMode("for-you");
    const list = rebuild("for-you", follows);
    idx = list.findIndex((d) => d.id === dish.id);
    setTimeout(() => feedRef.current?.children[idx]?.scrollIntoView(), 120);
  };

  /* Ask Crave: the chatbot (answers come from the Careem MCP via /api/chat) */
  async function sendChat(text = chatInput) {
    const content = text.trim();
    if (!content || chatBusy) return;
    const next: ChatMsg[] = [...chat, { role: "user", content }];
    setChat(next);
    setChatInput("");
    setChatBusy(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setChat([...next, { role: "assistant", content: data.reply, tools: data.toolsUsed, dishIds: data.dishIds, mode: data.mode }]);
    } catch (e) {
      setChat([...next, { role: "assistant", content: e instanceof Error ? e.message : "I couldn't reach Careem just now." }]);
    } finally {
      setChatBusy(false);
    }
  }
  const askFromSearch = () => {
    const q = query.trim();
    openPanel("chat");
    if (q) void sendChat(q);
  };

  /* upload a dish video */
  const pickFile = async (f: File | undefined) => {
    setFormError("");
    if (!f) return;
    if (!["video/mp4", "video/webm", "video/quicktime"].includes(f.type)) return setFormError("Choose an MP4, WebM or MOV video.");
    if (f.size > 100 * 1024 * 1024) return setFormError("Videos must be under 100 MB.");
    if (filePreview) URL.revokeObjectURL(filePreview);
    const url = URL.createObjectURL(f);
    setFile(f);
    setFilePreview(url);
    setPoster(await makePoster(url));
  };
  const resetUpload = () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFile(null);
    setFilePreview("");
    setPoster(null);
    setFormError("");
    setForm({ type: "restaurant", restaurant: "", cuisine: "Other", description: "", ingredients: "", name: "" });
    setUpItems([{ name: "", price: "" }]);
  };
  const validItems = upItems.filter((i) => i.name.trim() && i.price !== "" && Number(i.price) >= 0);
  const canPost = !!file && form.restaurant.trim() && validItems.length > 0 && !posting;
  const submitUpload = async () => {
    if (!file || !canPost) return;
    setPosting(true);
    setFormError("");
    try {
      const body = new FormData();
      body.set("video", file);
      if (poster) body.set("poster", new File([poster], "poster.jpg", { type: "image/jpeg" }));
      body.set("uploaderType", form.type);
      body.set("restaurant", form.restaurant);
      body.set("items", JSON.stringify(validItems.map((i) => ({ name: i.name.trim(), price: Number(i.price) }))));
      body.set("cuisine", form.cuisine);
      body.set("description", form.description);
      body.set("ingredients", form.type === "restaurant" ? form.ingredients : "");
      body.set("uploaderName", form.name);
      const r = await fetch("/api/uploads", { method: "POST", body });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      const dish = toDish(data.upload as UploadMeta);
      setTokens((t) => ({ ...t, [data.upload.id]: data.deleteToken }));
      setUploads((u) => [dish, ...u]);
      setFeed((cur) => [dish, ...cur]);
      active.current = 0;
      setCurrent(0);
      setPaused(false);
      requestAnimationFrame(() => feedRef.current?.scrollTo({ top: 0 }));
      resetUpload();
      close();
      flash("Your video is live");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setPosting(false);
    }
  };

  /* reviews and friends */
  const reviewList = (dish: Dish) => [...(myReviews[dish.id] ?? []), ...(sampleReviews[dish.id] ?? [])];
  const openReviews = (dish: Dish) => {
    setReviewFor(dish);
    setDraft("");
    setDraftRating(5);
    openPanel("reviews");
  };
  const postReview = () => {
    if (!reviewFor || !draft.trim()) return;
    const mine: Review = { name: "You", rating: draftRating, text: draft.trim(), when: "Just now" };
    setMyReviews((cur) => ({ ...cur, [reviewFor.id]: [mine, ...(cur[reviewFor.id] ?? [])] }));
    setDraft("");
    flash("Review posted");
  };
  const openFriends = (dish: Dish) => {
    setFriendsFor(dish);
    openPanel("friends");
  };

  const savedDishes = catalog.filter((d) => saved.has(d.id));
  const bagTabs = (
    <div className="mb-3 flex rounded-full bg-white/10 p-1 text-[11.5px] font-bold">
      {(
        [
          ["basket", `Bag (${basket.length})`],
          ["hitlist", `Hit list (${savedDishes.length})`],
        ] as const
      ).map(([key, label]) => (
        <button
          key={key}
          onClick={() => setPanel(key)}
          className={`flex-1 rounded-full py-1.5 transition ${panel === key ? "bg-white text-[#062a1c]" : "text-white/70"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="phone-shell">
      <span className="dynamic-island" />
      <main
        ref={screenRef}
        className={`phone-screen relative h-full w-full select-none overflow-hidden bg-black ${clean ? "clean" : ""}`}
      >
        {/* top bar: Careem mark · Following  For You · assistant + search */}
        <header className="hud top-bar pointer-events-none absolute inset-x-0 top-0 z-30 grid grid-cols-[1fr_auto_1fr] items-center px-4">
          <div className="pointer-events-auto flex items-center">
            <img src="/careem-icon.svg" alt="Careem" className="h-7 w-7" />
          </div>
          <div className="pointer-events-auto flex gap-5" style={{ textShadow: "0 1px 8px rgba(0,0,0,.7)" }}>
            {(["following", "for-you"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  rebuild(m, follows);
                }}
                className={`flex flex-col items-center text-[11.5px] font-bold transition ${mode === m ? "text-white" : "text-white/60"}`}
              >
                {m === "following" ? "Following" : "For You"}
                <span className={`mt-1 h-[2px] w-5 rounded-full ${mode === m ? "bg-white" : "bg-transparent"}`} />
              </button>
            ))}
          </div>
          <div className="pointer-events-auto flex justify-end gap-0.5 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,.6)]">
            <button aria-label="Ask Crave" onClick={() => openPanel("chat")} className="grid h-8 w-8 place-items-center">
              <Icon name="spark" size={20} />
            </button>
            <button aria-label="Search cravings" onClick={() => openPanel("search")} className="grid h-8 w-8 place-items-center">
              <Icon name="search" size={20} />
            </button>
          </div>
        </header>

        <p
          className="hud pointer-events-none absolute left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 text-[9.5px] font-semibold text-white/90"
          style={{ top: "calc(var(--top-h) - 4px)", textShadow: "0 1px 6px rgba(0,0,0,.8)" }}
        >
          <Icon name="pin" size={11} /> Dubai Marina
        </p>

        {/* the video feed */}
        <div
          ref={feedRef}
          onScroll={(e) => onScroll(e.currentTarget, e.timeStamp)}
          className="hide-scrollbar h-full snap-y snap-mandatory overflow-y-auto overscroll-contain"
        >
          {feed.length === 0 && (
            <div className="grid h-full place-items-center px-10 text-center">
              <div>
                <p className="text-[15px] font-bold">Nothing to show</p>
                <p className="mt-2 text-[12px] text-white/60">
                  {mode === "following"
                    ? "Follow accounts with the + on a dish and they'll show up in this tab."
                    : "You've hidden everything here. Reset hidden dishes from the search sheet."}
                </p>
              </div>
            </div>
          )}
          {feed.map((dish, index) => {
            const activity = friendActivity[dish.id] ?? [];
            const friends = activity.map((a) => a.name);
            const handle = handleOf(dish);
            const displayName = dish.creatorHandle ?? slug(dish.restaurant);
            const isFollowing = follows.has(handle);
            const inBag = basket.some((x) => x.id === dish.id);
            const multi = (dish.items?.length ?? 0) > 1;
            const itemsInBag = basket.filter((x) => x.id.startsWith(`${dish.id}#`)).length;
            const comments = reviewList(dish);
            const isCurrent = index === current;
            const isOpen = expanded === dish.id;
            const playable = !!(dish.tiktokId || dish.videoUrl);
            const tags = (dish.ingredients ?? []).map((i) => "#" + i.replace(/[^a-zA-Z0-9]/g, "")).join(" ");
            return (
              <section
                key={dish.id}
                onClick={(e) => onTap(dish, e)}
                onPointerDown={(e) => startPress(dish, e)}
                onPointerMove={movePress}
                onPointerUp={cancelPress}
                onPointerLeave={cancelPress}
                onPointerCancel={cancelPress}
                onContextMenu={(e) => e.preventDefault()}
                className="grain cqbox relative h-full snap-start overflow-hidden"
              >
                <Media
                  dish={dish}
                  live={isCurrent}
                  sound={sound}
                  failed={failed.has(dish.id)}
                  frameRef={frameRef}
                  videoRef={videoRef}
                  onFrameLoad={onFrameLoad}
                  onProgress={(tm, d) => d > 0 && setProgress({ t: tm, d })}
                />

                <div className="hud pointer-events-none absolute inset-0">
                  <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent via-25% to-black/70" />

                  {/* sound + pause: small plain icons, always reachable */}
                  {isCurrent && playable && (
                    <div
                      className="absolute right-4 flex flex-col gap-1 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,.6)]"
                      style={{ top: "calc(var(--top-h) + 10px)" }}
                    >
                      <button
                        aria-label={sound ? "Mute" : "Turn sound on"}
                        onClick={toggleSound}
                        className="pointer-events-auto grid h-8 w-8 place-items-center transition active:scale-90"
                      >
                        <Icon name={sound ? "volume" : "mute"} size={19} />
                      </button>
                      {!failed.has(dish.id) && (
                        <button
                          aria-label={paused ? "Play video" : "Pause video"}
                          onClick={togglePlay}
                          className="pointer-events-auto grid h-8 w-8 place-items-center transition active:scale-90"
                        >
                          <Icon name={paused ? "play" : "pause"} filled size={18} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* paused: TikTok's faint, plain play triangle (no circle, no shadow) */}
                  {isCurrent && playable && paused && !failed.has(dish.id) && (
                    <button
                      aria-label="Play video"
                      onClick={togglePlay}
                      className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50 transition active:scale-90"
                    >
                      <Icon name="play" filled size={58} />
                    </button>
                  )}

                  {/* right rail (low, like TikTok) */}
                  <div
                    className="absolute right-2.5 flex flex-col items-center gap-2"
                    style={{ bottom: "calc(var(--nav-h) + 54px)" }}
                  >
                    <div className="relative mb-2">
                      <span className="ring grid h-[46px] w-[46px] place-items-center rounded-full p-[2.5px]">
                        <span
                          className="grid h-full w-full place-items-center rounded-full border-2 border-black text-base font-bold uppercase"
                          style={{ background: `hsl(${hueOf(handle)} 55% 36%)` }}
                        >
                          {handle[1]}
                        </span>
                      </span>
                      <button
                        aria-label={isFollowing ? "Following" : "Follow"}
                        onClick={() => toggleFollow(dish)}
                        className="pointer-events-auto absolute -bottom-2 left-1/2 grid h-[18px] w-[18px] -translate-x-1/2 place-items-center rounded-full bg-[#2de3a1] text-[#062a1c] transition"
                      >
                        <Icon name={isFollowing ? "check" : "plus"} size={12} />
                      </button>
                    </div>
                    <RailButton label={compact(likeCounts[dish.id] ?? 0)} icon="heart" active={liked.has(dish.id)} onClick={() => love(dish)} />
                    <RailButton label={String(comments.length)} icon="chat" onClick={() => openReviews(dish)} />
                    <RailButton
                      label={saved.has(dish.id) ? "Saved" : "Save"}
                      icon="bookmark"
                      active={saved.has(dish.id)}
                      onClick={() => save(dish)}
                    />
                    <RailButton
                      label="Share"
                      icon="share"
                      onClick={() => {
                        navigator.clipboard?.writeText(dish.reviewUrl ?? location.href);
                        flash("Link copied");
                      }}
                    />
                  </div>

                  {/* TikTok-style caption */}
                  <div className="absolute left-4 right-[68px]" style={{ bottom: "calc(var(--nav-h) + 54px)", textShadow: "0 1px 8px rgba(0,0,0,.75)" }}>
                    {friends.length > 0 && (
                      <button
                        onClick={() => openFriends(dish)}
                        className="pointer-events-auto mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold text-white/90"
                      >
                        <span className="flex -space-x-1.5">
                          {friends.map((f) => (
                            <span
                              key={f}
                              className="grid h-4 w-4 place-items-center rounded-full border border-black text-[9px] font-bold"
                              style={{ background: friendColor[f] ?? `hsl(${hueOf(f)} 50% 40%)` }}
                            >
                              {f[0]}
                            </span>
                          ))}
                        </span>
                        {friends.length === 1 ? friends[0] : `${friends[0]} +${friends.length - 1}`} ordered this ›
                      </button>
                    )}
                    <p className="flex items-center gap-1 text-[14px] font-bold">
                      {displayName}
                    </p>
                    <p className={`mt-1 text-[12.5px] leading-[1.35] ${isOpen ? "" : "line-clamp-2"}`}>
                      <b>{dish.name}</b> at {dish.restaurant} — {dish.description} <b className="text-white/90">{tags}</b>
                    </p>
                    <button onClick={() => setExpanded(isOpen ? null : dish.id)} className="pointer-events-auto mt-0.5 text-[11.5px] font-bold text-white/80">
                      {isOpen ? "less" : "more"}
                    </button>
                    {isOpen && (
                      <div className="mt-1.5 flex flex-col items-start gap-1 text-[11px] text-white/85">
                        {dish.reviewUrl && (
                          <a href={dish.reviewUrl} target="_blank" rel="noreferrer" className="pointer-events-auto underline">
                            Watch the original on TikTok ↗
                          </a>
                        )}
                        {dish.restaurantHandle && dish.restaurantHandle !== dish.creatorHandle && dish.tiktokId && (
                          <a
                            href={`https://www.tiktok.com/@${dish.restaurantHandle}`}
                            target="_blank"
                            rel="noreferrer"
                            className="pointer-events-auto underline"
                          >
                            {dish.restaurant} on TikTok: {dish.restaurantHandle} ↗
                          </a>
                        )}
                        {ownAccount(dish) && <span>✔ Posted by the restaurant</span>}
                        {dish.uploadedBy === "customer" && <span>Shared by a customer</span>}
                        {dish.tags.length > 0 && (
                          <span>
                            {emojiOf(dish)} {dish.tags.join(" · ")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* the dishes in this video: pick which one(s) to add */}
                  {multi && openItems === dish.id && (
                    <div
                      className="pointer-events-auto absolute inset-x-4 rounded-2xl bg-black/70 p-1 backdrop-blur-md"
                      style={{ bottom: "calc(var(--nav-h) + 40px)" }}
                    >
                      {(dish.items ?? []).map((it, i) => {
                        const itemId = `${dish.id}#${i}`;
                        const has = basket.some((x) => x.id === itemId);
                        return (
                          <div key={itemId} className="flex items-center gap-3 px-2.5 py-2">
                            <span className="min-w-0 flex-1 truncate text-[11.5px] font-bold">{it.name}</span>
                            <span className="text-[10.5px] text-white/70">AED {it.price}</span>
                            <button
                              onClick={(e) => toggleBag(itemDish(dish, it, i), e.currentTarget)}
                              className={`w-14 text-right text-[10.5px] font-bold ${has ? "text-[#2de3a1]" : "text-white"}`}
                            >
                              {has ? "Remove" : "Add"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* minimal order row */}
                  <div
                    className="pointer-events-auto absolute inset-x-4 flex items-center justify-between"
                    style={{ bottom: "calc(var(--nav-h) + 10px)", textShadow: "0 1px 8px rgba(0,0,0,.75)" }}
                  >
                    <p className="text-[12.5px] font-bold">
                      {multi ? `${dish.items?.length} dishes · from AED ${Math.min(...(dish.items ?? []).map((x) => x.price))}` : `AED ${dish.price}`}
                    </p>
                    {multi ? (
                      <button
                        onClick={() => setOpenItems(openItems === dish.id ? null : dish.id)}
                        className={`flex items-center gap-1.5 text-[10.5px] font-bold transition active:scale-95 ${itemsInBag > 0 ? "text-[#2de3a1]" : "text-white"}`}
                      >
                        <Icon name={itemsInBag > 0 ? "check" : "bag"} size={15} />
                        {itemsInBag > 0 ? `In bag (${itemsInBag})` : "Add to bag"}
                        <span>{openItems === dish.id ? "▴" : "▾"}</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => toggleBag(dish, e.currentTarget)}
                        className={`flex items-center gap-1.5 text-[10.5px] font-bold transition active:scale-95 ${inBag ? "text-[#2de3a1]" : "text-white"}`}
                      >
                        <Icon name={inBag ? "check" : "bag"} size={15} />
                        {inBag ? "In bag · remove" : "Add to bag"}
                      </button>
                    )}
                  </div>

                  {index === 0 && (
                    <p
                      className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/55 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-white/80 backdrop-blur"
                      style={{ bottom: "calc(var(--nav-h) + 190px)" }}
                    >
                      Tap to pause · hold for more
                    </p>
                  )}
                </div>

                {isCurrent && playable && progress.d > 0 && (
                  <div
                    role="slider"
                    aria-label="Video position"
                    aria-valuemin={0}
                    aria-valuemax={Math.round(progress.d)}
                    aria-valuenow={Math.round(progress.t)}
                    className="seek"
                    onClick={seekFromClick}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <div className="seek-fill" style={{ width: `${Math.min(100, (progress.t / progress.d) * 100)}%` }} />
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* floating hearts from double-tap, and dishes flying into the bag */}
        {hearts.map((h) => (
          <span
            key={h.id}
            className="burst pointer-events-none absolute z-40 text-[#2de3a1]"
            style={{ left: h.x - 45, top: h.y - 45, ["--r" as string]: `${h.r}deg` }}
          >
            <Icon name="heart" filled size={90} />
          </span>
        ))}
        {flights.map((f) =>
          f.img ? (
            <img
              key={f.id}
              src={f.img}
              alt=""
              className="fly pointer-events-none absolute z-[60] h-11 w-11 rounded-xl border-2 border-white bg-white object-cover shadow-lg"
              style={{ left: f.x - 22, top: f.y - 22, ["--dx" as string]: `${f.dx}px`, ["--dy" as string]: `${f.dy}px` }}
            />
          ) : (
            <span
              key={f.id}
              className="fly pointer-events-none absolute z-[60] grid h-11 w-11 place-items-center rounded-xl bg-white text-2xl shadow-lg"
              style={{ left: f.x - 22, top: f.y - 22, ["--dx" as string]: `${f.dx}px`, ["--dy" as string]: `${f.dy}px` }}
            >
              {f.emoji}
            </span>
          ),
        )}

        {/* bottom bar: TikTok-style, black, slim and small */}
        <nav className="hud tabbar absolute inset-x-0 bottom-0 z-40 flex items-start justify-around bg-black px-1 pt-1.5 text-white/60">
          <button className="flex w-14 flex-col items-center gap-0.5 text-[8.5px] font-bold text-white">
            <Icon name="home" size={18} filled />
            Discover
          </button>
          <button onClick={() => openPanel("room")} className="flex w-14 flex-col items-center gap-0.5 text-[8.5px] font-bold">
            <Icon name="users" size={18} />
            Together
          </button>
          <button
            onClick={() => openPanel("upload")}
            aria-label="Share a dish video"
            className="grid h-7 w-10 place-items-center rounded-lg bg-[#2de3a1] text-[#062a1c] transition active:scale-90"
          >
            <Icon name="plus" size={17} />
          </button>
          <button
            ref={bagRef}
            onClick={() => openPanel("basket")}
            aria-label="Open bag"
            className={`relative flex w-14 flex-col items-center gap-0.5 text-[8.5px] font-bold ${bump ? "bump" : ""}`}
          >
            <Icon name="bag" size={18} />
            Bag
            {basket.length > 0 && (
              <span className="absolute right-2.5 top-[-3px] grid h-[14px] min-w-[14px] place-items-center rounded-full bg-[#2de3a1] px-1 text-[8.5px] font-bold text-[#062a1c]">
                {basket.length}
              </span>
            )}
          </button>
          <button onClick={() => openPanel("camera")} className="flex w-14 flex-col items-center gap-0.5 text-[8.5px] font-bold">
            <Icon name="camera" size={18} />
            Find dish
          </button>
        </nav>

        {toast && (
          <div className="pop absolute left-1/2 top-24 z-[70] w-max max-w-[85%] -translate-x-1/2 rounded-lg bg-black/80 px-4 py-2 text-center text-[10.5px] font-bold backdrop-blur">
            {toast}
          </div>
        )}
        {hint && (
          <div className="pop pointer-events-none absolute bottom-6 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/50 px-3 py-1.5 text-[9.5px] font-bold text-white/80 backdrop-blur">
            Tap again to bring back the details
          </div>
        )}

        {/* long-press menu */}
        {menuDish && (
          <div className="absolute inset-0 z-50 bg-black/60" onClick={() => setMenuDish(null)}>
            <div onClick={(e) => e.stopPropagation()} className="sheet absolute inset-x-0 bottom-0 rounded-t-[20px] bg-[#102019] px-4 pb-8 pt-2">
              <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-white/20" />
              <p className="mb-2 truncate text-[10.5px] font-bold uppercase tracking-widest text-white/40">{menuDish.name}</p>
              <MenuRow
                icon="eye"
                title="Clear display"
                sub="Hide the text. Tap the screen to bring it back"
                onClick={() => {
                  setMenuDish(null);
                  setCleanMode(true);
                }}
              />
              <MenuRow icon="eyeoff" title="Not interested" sub="Don't show this dish again" onClick={() => hideDishes(menuDish, "dish")} />
              <MenuRow
                icon="close"
                title={`Don't recommend ${menuDish.restaurant}`}
                sub="Hide everything from this restaurant"
                onClick={() => hideDishes(menuDish, "restaurant")}
              />
              <MenuRow
                icon="bookmark"
                title={saved.has(menuDish.id) ? "Remove from hit list" : "Save to hit list"}
                sub="Keep it for a later craving"
                onClick={() => {
                  save(menuDish);
                  setMenuDish(null);
                }}
              />
              {menuDish.uploadId && tokens[menuDish.uploadId] && (
                <MenuRow icon="minus" title="Delete my video" sub="Remove it for everyone" onClick={() => void deleteUpload(menuDish)} />
              )}
              <button onClick={() => setMenuDish(null)} className="mt-2 w-full rounded-xl bg-white/10 py-3 text-[12px] font-bold">
                Cancel
              </button>
            </div>
          </div>
        )}

        {panel && (
          <Sheet title={panelTitle[panel]} onClose={close} light={panel === "friends" || panel === "upload"}>
            {panel === "chat" && (
              <div>
                <div className="hide-scrollbar max-h-[46vh] min-h-[120px] space-y-3 overflow-y-auto pr-1">
                  {chat.length === 0 && (
                    <div className="rounded-2xl bg-white/5 p-4 text-[12px] leading-6 text-white/75">
                      Hi, I&apos;m Crave. Ask me for a recommendation or about a specific restaurant — I look things up on live Careem
                      menus.
                    </div>
                  )}
                  {chat.map((m, i) => (
                    <div key={i} className={m.role === "user" ? "flex justify-end" : "flex"}>
                      <div
                        className={`max-w-[86%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-[1.45] ${m.role === "user" ? "rounded-br-md bg-[#2de3a1] font-semibold text-[#062a1c]" : "rounded-bl-md bg-white/10"}`}
                      >
                        {m.content}
                        {m.dishIds && m.dishIds.length > 0 && (
                          <div className="mt-2 flex flex-col gap-1.5">
                            {m.dishIds
                              .map((id) => catalog.find((d) => d.id === id))
                              .filter((d): d is Dish => !!d)
                              .slice(0, 3)
                              .map((d) => (
                                <button
                                  key={d.id}
                                  onClick={() => jumpTo(d)}
                                  className="flex items-center gap-2 rounded-xl bg-black/30 px-2.5 py-1.5 text-left text-[11px] font-bold"
                                >
                                  <Icon name="play" filled size={12} />
                                  <span className="min-w-0 flex-1 truncate">{d.name}</span>
                                  <span className="text-white/60">AED {d.price}</span>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {chatBusy && <p className="text-[10.5px] font-semibold text-white/50">Crave is thinking…</p>}
                  <div ref={chatEndRef} />
                </div>
                {chat.length === 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {chatSuggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => void sendChat(s)}
                        className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                {chat.length > 0 && chat[chat.length - 1].mode === "basic" && (
                  <p className="mt-3 text-[9.5px] leading-4 text-white/35">
                    Crave is answering without an AI model. Add an ANTHROPIC_API_KEY to the server for open-ended answers.
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void sendChat()}
                    placeholder="Ask Crave anything about food…"
                    className={inputClass + " h-11"}
                  />
                  <button
                    onClick={() => void sendChat()}
                    disabled={chatBusy || !chatInput.trim()}
                    aria-label="Send"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#2de3a1] text-[#062a1c] disabled:opacity-40"
                  >
                    <Icon name="send" size={19} />
                  </button>
                </div>
              </div>
            )}

            {panel === "upload" && (
              <div>
                <div className="mb-3 flex rounded-full bg-[#e8f1f8] p-1 text-[12px] font-bold">
                  {(
                    [
                      ["restaurant", "I'm the restaurant"],
                      ["customer", "I'm a customer"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setForm((f) => ({ ...f, type: key }))}
                      className={`flex-1 rounded-full py-1.5 transition ${form.type === key ? "bg-white text-[#0b2230] shadow-sm" : "text-[#5b7083]"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <label className="mb-3 grid cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed border-[#b4d2e6] bg-[#f3f9fd] text-center">
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={(e) => void pickFile(e.target.files?.[0])}
                  />
                  {filePreview ? (
                    <video src={filePreview} muted playsInline autoPlay loop className="h-44 w-full object-cover" />
                  ) : (
                    <span className="py-7">
                      <span className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#2de3a1] to-[#4cc9f0] text-[#062a1c]">
                        <Icon name="plus" />
                      </span>
                      <strong className="block text-[12px]">Choose a video</strong>
                      <small className="text-[10.5px] text-[#5b7083]">MP4, WebM or MOV · up to 100 MB</small>
                    </span>
                  )}
                </label>

                <div className="space-y-2">
                  <input className={lightInput} placeholder="Restaurant name *" maxLength={80} value={form.restaurant} onChange={(e) => setForm((f) => ({ ...f, restaurant: e.target.value }))} />
                  <p className="pt-1 text-[10.5px] font-bold uppercase tracking-wider text-[#5b7083]">Dishes in this video</p>
                  {upItems.map((it, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        className={lightInput}
                        placeholder={i === 0 ? "Dish name *" : "Another dish"}
                        maxLength={80}
                        value={it.name}
                        onChange={(e) => setUpItems((l) => l.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))}
                      />
                      <input
                        className={lightInput + " !w-24 shrink-0"}
                        placeholder="AED *"
                        inputMode="decimal"
                        value={it.price}
                        onChange={(e) => setUpItems((l) => l.map((x, k) => (k === i ? { ...x, price: e.target.value.replace(/[^0-9.]/g, "") } : x)))}
                      />
                      {upItems.length > 1 && (
                        <button
                          aria-label="Remove this dish"
                          onClick={() => setUpItems((l) => l.filter((_, k) => k !== i))}
                          className="grid h-10 w-8 shrink-0 place-items-center rounded-lg text-[#7a8fa0]"
                        >
                          <Icon name="close" size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  {upItems.length < 8 && (
                    <button
                      onClick={() => setUpItems((l) => [...l, { name: "", price: "" }])}
                      className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#0a8fb8]"
                    >
                      <Icon name="plus" size={14} /> Add another dish
                    </button>
                  )}
                  <select className={lightInput} value={form.cuisine} onChange={(e) => setForm((f) => ({ ...f, cuisine: e.target.value as Cuisine }))}>
                    {CUISINE_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <textarea
                    className={lightInput + " h-20 resize-none py-2"}
                    placeholder="What is it? Describe the dish"
                    maxLength={400}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                  {form.type === "restaurant" && (
                    <input
                      className={lightInput}
                      placeholder="Ingredients, separated by commas"
                      maxLength={300}
                      value={form.ingredients}
                      onChange={(e) => setForm((f) => ({ ...f, ingredients: e.target.value }))}
                    />
                  )}
                  {form.type === "customer" && (
                    <input className={lightInput} placeholder="Your name (optional)" maxLength={40} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  )}
                </div>

                {formError && <p className="mt-3 text-[12px] font-semibold text-[#d64545]">{formError}</p>}
                <button
                  onClick={() => void submitUpload()}
                  disabled={!canPost}
                  className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#2de3a1] to-[#4cc9f0] py-3 text-[13px] font-bold text-[#062a1c] shadow-[0_6px_18px_rgba(76,201,240,.35)] disabled:opacity-40 disabled:shadow-none"
                >
                  {posting ? "Uploading…" : "Post video"}
                </button>
                <p className="mt-3 text-center text-[10px] leading-4 text-[#7a8fa0]">
                  Everyone using this app will be able to see your video. Only upload videos you filmed or have permission to share.
                </p>
              </div>
            )}

            {panel === "search" && (
              <div>
                <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3">
                  <Icon name="search" size={18} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitQuery()}
                    placeholder="Search dishes, restaurants, cravings"
                    className="h-11 min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-white/35"
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={submitQuery} className="h-10 flex-1 rounded-lg bg-[#2de3a1] text-[12px] font-bold text-[#062a1c]">
                    Search
                  </button>
                  <button onClick={askFromSearch} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/10 text-[12px] font-bold">
                    <Icon name="spark" size={15} /> Ask Crave
                  </button>
                </div>

                {!results && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {cravings.map((c) => (
                      <button
                        key={c.label}
                        onClick={() => showResults(c.label, c.test)}
                        className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11.5px] font-bold"
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}

                {results && (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[10.5px] font-bold uppercase tracking-widest text-white/40">
                        {results.dishes.length} for “{results.label}”
                      </p>
                      <button onClick={() => setResults(null)} className="text-[10.5px] font-bold text-[#2de3a1]">
                        Clear
                      </button>
                    </div>
                    {results.dishes.length === 0 ? (
                      <p className="rounded-xl bg-white/5 p-4 text-[12px] text-white/60">
                        Nothing in the feed matches that yet. Try Ask Crave — it can search Careem&apos;s live menus too.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {results.dishes.map((d) => (
                          <div key={d.id} className="flex items-center gap-3 rounded-xl bg-white/5 p-2">
                            <button onClick={() => jumpTo(d)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                              {d.imageUrl ? (
                                <img src={d.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                              ) : (
                                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-white/10 text-[17px]">{emojiOf(d)}</span>
                              )}
                              <span className="min-w-0">
                                <strong className="block truncate text-[12px]">{d.name}</strong>
                                <small className="block truncate text-white/50">
                                  {d.restaurant} · AED {d.price}
                                </small>
                              </span>
                            </button>
                            <button
                              onClick={() => jumpTo(d)}
                              className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-[10.5px] font-bold"
                            >
                              Watch
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button onClick={() => setPanel("camera")} className="mt-5 flex w-full items-center gap-3 rounded-xl bg-white/5 p-3 text-left">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10">
                    <Icon name="camera" size={18} />
                  </span>
                  <span>
                    <strong className="block text-[12px]">Search by photo</strong>
                    <small className="text-white/45">Upload a food screenshot</small>
                  </span>
                </button>
                {hidden.size > 0 && (
                  <button
                    onClick={() => {
                      const none = new Set<string>();
                      setHidden(none);
                      rebuild(mode, follows, none);
                      close();
                      flash("Hidden dishes are back");
                    }}
                    className="mt-3 w-full rounded-xl bg-white/5 py-3 text-[12px] font-bold text-white/70"
                  >
                    Show {hidden.size} hidden dish{hidden.size === 1 ? "" : "es"} again
                  </button>
                )}
              </div>
            )}

            {panel === "camera" && (
              <div>
                {upload ? (
                  <div className="space-y-4">
                    <img src={upload} alt="Uploaded food" className="h-48 w-full rounded-2xl object-cover" />
                    <div className="rounded-2xl bg-[#173027] p-4">
                      <p className="text-[10.5px] font-bold text-[#2de3a1]">VISUAL MATCH · PROTOTYPE</p>
                      <p className="mt-1 text-[15px] font-bold">Oshi Pressed Sushi</p>
                      <p className="text-[12px] text-white/55">Image matching is a mock-up: it always shows this dish.</p>
                    </div>
                    <button
                      onClick={() => {
                        const target = catalog.find((d) => d.id === "sushi");
                        if (target) jumpTo(target);
                      }}
                      className="w-full rounded-xl bg-[#2de3a1] py-3 font-bold text-[#062a1c]"
                    >
                      Show it in the feed
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
                      <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#2de3a1] text-[#062a1c]">
                        <Icon name="camera" />
                      </span>
                      <strong>Upload a food screenshot</strong>
                      <small className="mt-1 block text-white/45">We&apos;ll find similar dishes nearby</small>
                    </span>
                  </label>
                )}
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

            {panel === "friends" && friendsFor && (
              <div>
                <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-[#e9fbf4] to-[#e6f4fc] p-3">
                  {friendsFor.imageUrl ? (
                    <img src={friendsFor.imageUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-white text-2xl">{emojiOf(friendsFor)}</span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold">{friendsFor.name}</p>
                    <p className="text-[11px] text-[#5b7083]">{friendsFor.restaurant}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {(friendActivity[friendsFor.id] ?? []).map((a) => (
                    <div key={a.name} className="flex items-center gap-3 rounded-xl bg-[#f3f8fc] p-3">
                      <span
                        className="grid h-10 w-10 place-items-center rounded-full text-[12px] font-bold text-white"
                        style={{ background: friendColor[a.name] ?? `hsl(${hueOf(a.name)} 50% 45%)` }}
                      >
                        {a.name[0]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-bold">{a.name}</p>
                        <p className="text-[11px] text-[#5b7083]">Ordered {a.when}</p>
                      </div>
                      <span className="text-[12px] text-[#f5b301]">{stars(a.stars)}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => openPanel("room")}
                  className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#2de3a1] to-[#4cc9f0] py-3 text-[13px] font-bold text-[#062a1c] shadow-[0_6px_18px_rgba(76,201,240,.35)]"
                >
                  Order together
                </button>
                <p className="mt-4 text-center text-[10px] text-[#7a8fa0]">Sample friend activity for this prototype.</p>
              </div>
            )}

            {panel === "reviews" && reviewFor && (
              <div>
                <div className="mb-4 flex items-center gap-3 rounded-2xl bg-white/5 p-3">
                  {reviewFor.imageUrl && <img src={reviewFor.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />}
                  <div className="min-w-0">
                    <p className="truncate font-bold">{reviewFor.name}</p>
                    <p className="text-[10.5px] text-white/55">{reviewFor.restaurant}</p>
                  </div>
                </div>

                <div className="mb-4 rounded-2xl bg-white/5 p-3">
                  <div className="mb-2 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        aria-label={`${n} star${n === 1 ? "" : "s"}`}
                        onClick={() => setDraftRating(n)}
                        className={`text-[20px] leading-none ${n <= draftRating ? "text-[#ffd25e]" : "text-white/20"}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && postReview()}
                      placeholder="Share what you thought…"
                      className={inputClass}
                    />
                    <button
                      onClick={postReview}
                      disabled={!draft.trim()}
                      className="rounded-lg bg-[#2de3a1] px-4 text-[12px] font-bold text-[#062a1c] disabled:opacity-40"
                    >
                      Post
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {reviewList(reviewFor).length === 0 && <p className="py-4 text-center text-[12px] text-white/50">No reviews yet — be the first.</p>}
                  {reviewList(reviewFor).map((r, i) => (
                    <div key={`${r.name}-${i}`} className="flex gap-3">
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold"
                        style={{ background: `hsl(${hueOf(r.name)} 50% 34%)` }}
                      >
                        {r.name[0]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-bold">
                          {r.name} <span className="font-normal text-white/40">· {r.when}</span>
                        </p>
                        <p className="text-[9.5px] text-[#ffd25e]">{stars(r.rating)}</p>
                        <p className="mt-0.5 text-[12px] leading-5 text-white/80">{r.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-center text-[9.5px] text-white/35">
                  Sample reviews for this prototype. Reviews you post are saved on this device only.
                </p>
              </div>
            )}

            {panel === "hitlist" && (
              <div>
                {bagTabs}
                {savedDishes.length === 0 ? (
                  <p className="py-8 text-center text-[12px] text-white/55">Tap the bookmark on a dish to save it for a later craving.</p>
                ) : (
                  <div className="space-y-2">
                    {savedDishes.map((d) => (
                      <div key={d.id} className="flex items-center gap-3 rounded-xl bg-white/5 p-2">
                        <button onClick={() => jumpTo(d)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                          {d.imageUrl ? (
                            <img src={d.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
                          ) : (
                            <span className="grid h-12 w-12 place-items-center rounded-lg bg-white/10 text-[17px]">{emojiOf(d)}</span>
                          )}
                          <span className="min-w-0">
                            <strong className="block truncate text-[12px]">{d.name}</strong>
                            <small className="text-white/50">
                              {d.restaurant} · AED {d.price}
                            </small>
                          </span>
                        </button>
                        <button
                          onClick={() => toggleBag(d)}
                          className="rounded-lg bg-[#2de3a1] px-3 py-2 text-[10.5px] font-bold text-[#062a1c]"
                        >
                          {basket.some((x) => x.id === d.id) ? "Remove" : "Add"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {panel === "basket" && (
              <div>
                {bagTabs}
                {basket.length === 0 ? (
                  <p className="py-8 text-center text-[12px] text-white/55">Add a dish that makes you stop scrolling.</p>
                ) : (
                  <div className="space-y-2">
                    {basket.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 rounded-xl bg-white/5 p-2">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="h-11 w-11 rounded-lg object-cover" />
                        ) : (
                          <span className="grid h-11 w-11 place-items-center rounded-lg bg-white/10 text-[17px]">{emojiOf(item)}</span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-bold">{item.name}</p>
                          <p className="text-[10.5px] text-white/50">{item.restaurant}</p>
                        </div>
                        <span className="text-[12px] font-bold">AED {item.price}</span>
                        <button
                          aria-label={`Remove ${item.name}`}
                          onClick={() => removeFromBag(item)}
                          className="grid h-8 w-8 place-items-center rounded-full bg-white/10"
                        >
                          <Icon name="close" size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                  <div>
                    <p className="text-[10.5px] text-white/45">Subtotal</p>
                    <p className="text-[20px] font-bold">AED {total}</p>
                  </div>
                  <button
                    disabled={!basket.length}
                    onClick={() => setSplit(true)}
                    className="rounded-xl bg-[#2de3a1] px-5 py-3 font-bold text-[#062a1c] disabled:opacity-30"
                  >
                    <Icon name="card" size={18} /> <span className="ml-1">Split & checkout</span>
                  </button>
                </div>
                {split && <SplitVote basket={basket} total={total} onComplete={() => flash("Payment links sent")} />}
              </div>
            )}
          </Sheet>
        )}
      </main>
    </div>
  );
}
