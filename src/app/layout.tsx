import type { Metadata, Viewport } from "next";
import { TikTok_Sans } from "next/font/google";
import "./globals.css";

const tiktok = TikTok_Sans({ variable: "--font-tiktok", subsets: ["latin"], weight: "variable" });

export const metadata: Metadata = {
  title: "Crave — food worth stopping for",
  description: "Swipe through dishes you can order on Careem right now.",
};

export const viewport: Viewport = { themeColor: "#000000", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en" className={tiktok.variable}><body>{children}</body></html>;
}
