import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrewMate",
  description: "Book trusted plumbing, electrical and AC repair in Ahmedabad.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
