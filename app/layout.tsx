import type { Metadata } from "next";
import { AuthHashRouter } from "@/components/AuthHashRouter";
import DevServiceWorkerReset from "@/components/DevServiceWorkerReset";
import { DailyReminderScheduler } from "@/components/DailyReminderScheduler";
import { GlobalChatbot } from "@/components/chat/GlobalChatbot";
import { Navbar } from "@/components/Navbar";
import { PXPersonalizationController } from "@/components/PXPersonalizationController";
import { ThemeController } from "@/components/ThemeController";
import { Toaster } from "sonner";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "PostureX - Engineered posture intelligence",
  description: "Engineered posture intelligence for developers, gamers, professionals, and athletes."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <ThemeController />
        <PXPersonalizationController />
        <AuthHashRouter />
        <DevServiceWorkerReset />
        <DailyReminderScheduler />
        <Navbar />
        <Toaster richColors theme="dark" position="top-right" />
        <main className="pt-20 pb-8">{children}</main>
        <GlobalChatbot />
      </body>
    </html>
  );
}
