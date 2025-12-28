import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="antialiased min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        {children}
      </body>
    </html>
  );
}
