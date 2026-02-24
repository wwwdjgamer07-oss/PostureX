import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { AuthHashRouter } from "@/components/AuthHashRouter";
import DevServiceWorkerReset from "@/components/DevServiceWorkerReset";
import { DailyReminderScheduler } from "@/components/DailyReminderScheduler";
import { Navbar } from "@/components/Navbar";
import { PXPersonalizationController } from "@/components/PXPersonalizationController";
import { ThemeController } from "@/components/ThemeController";
import { getAppName, getAppUrl } from "@/lib/env";
import { Toaster } from "sonner";
import "@/styles/globals.css";

const GlobalChatbot = dynamic(
  () => import("@/components/chat/GlobalChatbot").then((module) => module.GlobalChatbot),
  { ssr: false }
);

const appName = getAppName();
const appUrl = getAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "PostureX",
  description: "AI posture intelligence & PX Play arcade",
  applicationName: appName,
  openGraph: {
    title: "PostureX",
    description: "AI posture intelligence & PX Play arcade",
    url: appUrl,
    siteName: appName,
    type: "website",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "PostureX"
      }
    ]
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
    apple: ["/icon.svg"]
  },
  twitter: {
    card: "summary_large_image",
    title: "PostureX",
    description: "AI posture intelligence & PX Play arcade",
    images: ["/og-image.svg"]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <ThemeController />
        <PXPersonalizationController />
        <AuthHashRouter />
        <DevServiceWorkerReset />
        <DailyReminderScheduler />
        <Navbar />
        <Toaster richColors theme="dark" position="top-right" />
        <main className="app-root min-h-dvh flex flex-col px-4 pt-20 pb-[calc(env(safe-area-inset-bottom)+6rem)] sm:pb-10">{children}</main>
        <GlobalChatbot />
      </body>
    </html>
  );
}
