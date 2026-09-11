import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/settings";

export const revalidate = 3600;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSettings();

  return {
    name: settings.companyName,
    short_name: "DreamFly",
    description: settings.defaultSeoDescription || settings.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#fbfaf8",
    theme_color: "#101f40",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
