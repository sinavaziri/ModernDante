import type { Metadata } from "next";
import { Libre_Franklin } from "next/font/google";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sabon.variable} ${libreFranklin.variable}`}>
      <body className="antialiased min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
