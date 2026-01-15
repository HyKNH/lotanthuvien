import type { Metadata } from "next";
import { Geist, Geist_Mono, Cactus_Classical_Serif } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cactus = Cactus_Classical_Serif({
  variable: "--font-cactus",
  weight: "400", 
  subsets: ["latin"],
});

const nomNaTong = localFont({
  src: "/fonts/NomNaTong.woff",
  variable: "--font-nomnatong",
  weight: "400",
});

export const metadata: Metadata = {
  title: "瀘傘書院 - Lô Tản thư viện",
  description: "Hán Nôm library",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cactus.variable} ${nomNaTong.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
