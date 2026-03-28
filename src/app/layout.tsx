import type { Metadata } from "next";
import { Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import SessionProvider from "@/components/providers/SessionProvider";
import ServiceWorkerProvider from "@/components/providers/ServiceWorkerProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "St. Helen's School - Report Card System",
  description: "Comprehensive report card management system for St. Helen's School",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0369a1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${manrope.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <SessionProvider>
            <div className="min-h-screen flex flex-col">
              <main className="flex-1">{children}</main>
            </div>
          </SessionProvider>
        </QueryProvider>
        <ServiceWorkerProvider />
        <Toaster />
      </body>
    </html>
  );
}
