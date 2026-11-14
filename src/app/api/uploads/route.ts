import { NextResponse } from "next/server";
import {
  CUISINES,
  IMAGE_TYPES,
  MAX_POSTER_BYTES,
  MAX_VIDEO_BYTES,
  VIDEO_TYPES,
  publicView,
  readIndex,
  saveUpload,
} from "@/lib/uploads";

const clean = (value: FormDataEntryValue | null, max: number) =>
  typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";

export async function GET(request: Request) {
  void request.url; // reads request data, so this is always rendered at request time
  const list = await readIndex();
  return NextResponse.json({ uploads: list.map(publicView) });
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const video = form.get("video");
    const poster = form.get("poster");
    if (!(video instanceof File) || !VIDEO_TYPES[video.type])
      return NextResponse.json({ error: "Choose an MP4, WebM or MOV video." }, { status: 400 });
    if (video.size === 0 || video.size > MAX_VIDEO_BYTES)
      return NextResponse.json({ error: "Videos must be under 100 MB." }, { status: 400 });
    const posterFile =
      poster instanceof File && poster.size > 0 && poster.size <= MAX_POSTER_BYTES && IMAGE_TYPES[poster.type] ? poster : null;

    const restaurant = clean(form.get("restaurant"), 80);
    const dish = clean(form.get("dish"), 80);
    const price = Number(clean(form.get("price"), 8));
    const cuisineRaw = clean(form.get("cuisine"), 20);
    const cuisine = (CUISINES as readonly string[]).includes(cuisineRaw) ? (cuisineRaw as (typeof CUISINES)[number]) : "Other";
    const uploaderType = form.get("uploaderType") === "restaurant" ? "restaurant" : "customer";
    if (!restaurant || !dish) return NextResponse.json({ error: "Add the restaurant and the dish name." }, { status: 400 });
    if (!Number.isFinite(price) || price < 0 || price > 2000)
      return NextResponse.json({ error: "Enter the price in AED." }, { status: 400 });

    const ingredients = clean(form.get("ingredients"), 300)
      .split(",")
      .map((i) => i.trim().slice(0, 30))
      .filter(Boolean)
      .slice(0, 8);

    const record = await saveUpload(
      {
        uploaderType,
        restaurant,
        dish,
        price,
        cuisine,
        description: clean(form.get("description"), 400),
        ingredients,
        uploaderName: clean(form.get("uploaderName"), 40) || undefined,
      },
      video,
      posterFile,
    );
    return NextResponse.json({ upload: publicView(record), deleteToken: record.deleteToken }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
