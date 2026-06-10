import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/components/AppProvider";
import { LockGate } from "@/components/LockGate";
import { TabBar } from "@/components/TabBar";
import { ServiceWorker } from "@/components/ServiceWorker";
import { DailyCheckIn } from "@/components/DailyCheckIn";
import { Onboarding } from "@/components/Onboarding";

export const metadata: Metadata = {
  title: "IronLog",
  description: "Local-first hypertrophy training tracker",
  applicationName: "IronLog",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "IronLog",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <AppProvider>
          <LockGate>
            <main className="app-scroll">{children}</main>
            <TabBar />
            <DailyCheckIn />
          </LockGate>
          <Onboarding />
          <ServiceWorker />
        </AppProvider>
      </body>
    </html>
  );
}
