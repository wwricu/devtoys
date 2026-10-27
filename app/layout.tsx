import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { LangProvider } from "@/lib/i18n";
import { themeScript } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Dev Toys - Free Online Developer Tools",
    template: "%s | Dev Toys",
  },
  description:
    "Free online developer tools: JSON formatter, XML formatter, Base64 encoder, QR code generator and more. All tools run entirely in your browser — nothing is uploaded.",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  keywords: [
    "developer tools",
    "JSON formatter",
    "XML formatter",
    "Base64 encoder",
    "QR code generator",
    "online tools",
    "browser tools",
    "free tools",
    "no upload",
    "privacy",
  ],
  authors: [{ name: "Dev Toys" }],
  creator: "Dev Toys",
  publisher: "Dev Toys",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Dev Toys - Free Online Developer Tools",
    description:
      "Free online developer tools that run entirely in your browser. No data is uploaded.",
    siteName: "Dev Toys",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dev Toys - Free Online Developer Tools",
    description:
      "Free online developer tools that run entirely in your browser.",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Applied before paint so a dark theme never flashes white. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex h-dvh flex-col overflow-hidden bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 md:flex-row">
        <LangProvider>
          <Sidebar />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 md:p-4">
              {children}
            </div>
          </main>
        </LangProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
