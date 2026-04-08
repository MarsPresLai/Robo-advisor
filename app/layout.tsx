import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DAT.co Robo-Advisor",
  description: "A robo-advisor dashboard for tracking Strategy's premium to NAV against Bitcoin.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
