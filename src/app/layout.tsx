import type { Metadata } from "next";
import { Cardo, Source_Sans_3 } from "next/font/google";
import "./globals.css";

// Classical serif - Cardo is a Bembo-like Renaissance typeface
const cardo = Cardo({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "700"],
});

// Clean humanist sans-serif for navigation and UI elements
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
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
    <html lang="en" className={`${sourceSans.variable} ${cardo.variable}`}>
      <body className="antialiased min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
