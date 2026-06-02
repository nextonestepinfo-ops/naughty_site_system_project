import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/app/providers";

export const metadata: Metadata = {
  title: "Nos OS | Nos Technology",
  description: "株式会社Nosテック internal business OS",
  applicationName: "Nos OS",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Nos OS",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#F8FAFC",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
