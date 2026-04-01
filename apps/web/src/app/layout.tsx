import type { Metadata } from "next";
import localFont from "next/font/local";
import { cookies, headers } from "next/headers";
import { TelemetryBootstrap } from "@/app/TelemetryBootstrap";
import { SiteShell } from "@/components/layout/SiteShell";
import { AuthProvider } from "@/lib/AuthContext";
import { LanguageProvider, type Language } from "@/lib/LanguageContext";
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

const isLanguage = (value: string | undefined): value is Language => value === "ko" || value === "en";

const resolveInitialLanguage = async (): Promise<Language> => {
  const cookieStore = await cookies();
  const stored = cookieStore.get("freestyle-language")?.value;
  if (isLanguage(stored)) {
    return stored;
  }

  const headerStore = await headers();
  const acceptLanguage = headerStore.get("accept-language")?.toLowerCase() ?? "";
  return acceptLanguage.startsWith("ko") ? "ko" : "en";
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialLanguage = await resolveInitialLanguage();

  return (
    <html lang={initialLanguage}>
      <body className={`${a2jFont.variable} font-sans antialiased bg-background text-foreground`}>
        <AuthProvider>
          <LanguageProvider initialLanguage={initialLanguage}>
            <TelemetryBootstrap />
            <SiteShell>{children}</SiteShell>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
