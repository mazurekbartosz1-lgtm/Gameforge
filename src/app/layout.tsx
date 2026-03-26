import type { Metadata } from "next";
import { Space_Grotesk, Plus_Jakarta_Sans, Press_Start_2P } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const pressStart = Press_Start_2P({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GameForge — Your Game. Your Rules.",
  description: "Multiplayer survival game shaped by your group.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="pl"
        className={`${spaceGrotesk.variable} ${plusJakarta.variable} ${pressStart.variable}`}
        style={{ height: "100%" }}
      >
        <body style={{ minHeight: "100%", margin: 0, padding: 0, background: "#0b0c1f" }}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
