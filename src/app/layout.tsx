import type { Metadata, Viewport } from "next";
import { Libre_Franklin } from "next/font/google";
import localFont from "next/font/local";
import SiteFooter from "@/components/SiteFooter";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

// Sabon - elegant Renaissance serif for body text
const sabon = localFont({
  src: [
    {
      path: "../../public/fonts/Sabon.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/SabonItalic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../public/fonts/SabonBold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/SabonBoldItalic.ttf",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-serif",
  display: "swap",
});

// The one sans-serif, for navigation, buttons and small interface text. Everything else is Sabon.
const libreFranklin = Libre_Franklin({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "The Divine Comedy - Modern Translation",
  description: "Dante's Divine Comedy in modern English, with Gustave Doré's illustrations and character-voiced narration",
};

// The browser's own bars match the page background in each theme
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#191011" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The theme script adds the dark class before React loads, so React mustn't treat it as a mismatch
    <html lang="en" className={`${sabon.variable} ${libreFranklin.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="antialiased min-h-screen bg-background text-foreground">
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
