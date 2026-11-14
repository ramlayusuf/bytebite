import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crave — food worth stopping for",
  description: "Swipe through dishes you can order on Careem right now.",
};

export const viewport: Viewport = { themeColor: "#07110d", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en"><body>{children}</body></html>;
}
