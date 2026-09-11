import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { buildMetadata } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { Analytics, GtmNoScript } from "@/components/site/analytics";
import { AttributionCapture } from "@/components/site/attribution-capture";
import "./globals.css";

/**
 * Plus Jakarta Sans carries the display voice — its geometric forms and single-
 * storey 'a' echo the logo wordmark. Inter handles UI and body copy, where its
 * larger x-height keeps long visa requirements readable at small sizes.
 * Both are self-hosted by next/font: no render-blocking request to Google.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const base = await buildMetadata();
  const settings = await getSettings();
  return {
    ...base,
    title: {
      default: settings.defaultSeoTitle || `${settings.companyName} — ${settings.tagline}`,
      template: `%s | ${settings.companyName}`,
    },
    applicationName: settings.companyName,
    icons: {
      icon: [
        { url: settings.favicon?.url ?? "/brand/favicon.ico", sizes: "any" },
        { url: "/brand/icon-192.png", type: "image/png", sizes: "192x192" },
        { url: "/brand/icon-512.png", type: "image/png", sizes: "512x512" },
      ],
      apple: [{ url: "/brand/apple-icon.png", sizes: "180x180" }],
    },
    manifest: "/manifest.webmanifest",
    formatDetection: { telephone: true, address: false, email: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#101f40",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();

  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <body>
        <GtmNoScript gtmContainerId={settings.gtmContainerId} />
        <AttributionCapture />
        {children}
        <Analytics
          gaMeasurementId={settings.gaMeasurementId}
          gtmContainerId={settings.gtmContainerId}
          metaPixelId={settings.metaPixelId}
        />
      </body>
    </html>
  );
}
