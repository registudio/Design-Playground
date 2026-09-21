import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Design Playground",
  description: "Explore motion and interactions, compose a website, and export your design handoff.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
