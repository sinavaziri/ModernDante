import type { Metadata } from "next";
import { Source_Sans_3, Libre_Franklin } from "next/font/google";
import localFont from "next/font/local";
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

// Clean humanist sans-serif for UI elements
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// Classic professional sans-serif for navigation
const libreFranklin = Libre_Franklin({
  subsets: ["latin"],
  variable: "--font-nav",
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "The Divine Comedy - Modern Translation",
  description: "Experience Dante's Divine Comedy with side-by-side original and modern English translations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sourceSans.variable} ${sabon.variable} ${libreFranklin.variable}`}>
      <body className="antialiased min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
