import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Design Playground",
  description: "Visual configuration layer for the website-delivery engine",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
