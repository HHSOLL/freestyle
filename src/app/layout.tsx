import type { Metadata } from "next";
import localFont from "next/font/local";
import { Header } from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";
import { LanguageProvider } from "@/lib/LanguageContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "FreeStyle | 비주얼 인텔리전스 아카이브",
  description: "현대적 큐레이션을 위한 고해상도 디지털 아틀리에.",
  icons: {
    icon: [
      { url: "/favicon.ico?v=2" },
      { url: "/icon.svg?v=2", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico?v=2",
    apple: "/apple-icon.png?v=2",
  },
};

const a2jFont = localFont({
  src: [
    { path: "../assets/fonts/a2j/A2J-Thin.woff2", weight: "100", style: "normal" },
    { path: "../assets/fonts/a2j/A2J-ExtraLight.woff2", weight: "200", style: "normal" },
    { path: "../assets/fonts/a2j/A2J-Light.woff2", weight: "300", style: "normal" },
    { path: "../assets/fonts/a2j/A2J-Regular.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/a2j/A2J-Medium.woff2", weight: "500", style: "normal" },
    { path: "../assets/fonts/a2j/A2J-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../assets/fonts/a2j/A2J-Bold.woff2", weight: "700", style: "normal" },
    { path: "../assets/fonts/a2j/A2J-ExtraBold.woff2", weight: "800", style: "normal" },
    { path: "../assets/fonts/a2j/A2J-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-a2j",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${a2jFont.variable} font-sans antialiased bg-background text-foreground`}>
        <LanguageProvider>
          <Header />
          <main className="min-h-screen pt-16">
            {children}
          </main>
          <MobileNav />
        </LanguageProvider>
      </body>
    </html>
  );
}
