import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import ServiceWorker from "@/components/ServiceWorker";
import Sidebar from "@/components/Sidebar";
import StandaloneTitle from "@/components/StandaloneTitle";
import { LangProvider } from "@/lib/i18n";
import { SITE_ORIGIN } from "@/lib/site";
import { themeScript } from "@/lib/theme";

// The two SDKs fetch paths under /_vercel, which only exist on Vercel. Off the
// platform they are two 404s on every page, so a local run looks broken.
const onVercel = process.env.VERCEL_ENV !== undefined;

// React inserts the font preload hints after the load event, so on a warm cache
// Chromium counts them as preloaded-but-unused. The render-blocking stylesheet
// asks for the same files, so the hints buy nothing here.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  // Resolves the relative canonical / og:url each route emits.
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: "Dev Toys",
    template: "%s | Dev Toys",
  },
  description:
    "Free online developer tools: JSON formatter, XML formatter, Base64 encoder, QR code generator and more. All tools run entirely in your browser — nothing is uploaded.",
  icons: {
    icon: "/favicon.svg",
    apple: "/icons/apple-touch-icon.png",
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
    title: "Dev Toys - Developer Tools",
    description:
      "Free online developer tools that run entirely in your browser. No data is uploaded.",
    siteName: "Dev Toys",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dev Toys - Developer Tools",
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
      suppressHydrationWarning
    >
      <head>
        {/* Not via manifest.ts: metadata tags are re-created on every client navigation. */}
        <link rel="manifest" href="/manifest.webmanifest" />
        {/* Applied before paint so a dark theme never flashes white. */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
      <body className="flex h-dvh flex-col overflow-hidden bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 md:flex-row">
        <LangProvider>
          <Sidebar />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div
              data-main-scroll
              className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 md:p-4"
            >
              {children}
            </div>
          </main>
        </LangProvider>
        <ServiceWorker />
        <StandaloneTitle />
        {onVercel && <Analytics />}
        {onVercel && <SpeedInsights />}
      </body>
    </html>
  );
}
