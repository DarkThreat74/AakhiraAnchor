import type { Metadata, Viewport } from "next";
import { Spectral, Amiri } from "next/font/google";
import "./globals.css";
import { UISFXProvider } from "@/components/uisfx-provider";
import NativeShellEnhancements from "@/components/native-shell-enhancements";

const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://waqt.app"),
  title: "Waqt — Prayer-centered life tracker",
  description:
    "A calendar and accountability system where the five daily prayers are the fixed anchor everything else is scheduled around.",
  manifest: "/manifest.webmanifest",
  applicationName: "Waqt",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Waqt",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Waqt — Prayer-centered life tracker",
    description:
      "A calendar and accountability system where the five daily prayers are the fixed anchor everything else is scheduled around.",
    type: "website",
    siteName: "Waqt",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Waqt — Prayer-centered life tracker",
    description:
      "A calendar and accountability system where the five daily prayers are the fixed anchor everything else is scheduled around.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1815",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Inline script — runs before paint to prevent flash of wrong theme
  const themeScript = `(function(){try{var t=localStorage.getItem("waqt:theme");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.setAttribute("data-theme","dark")}else{document.documentElement.setAttribute("data-theme","light")}}catch(e){}})()`;

  return (
    <html
      lang="en"
      className={`${spectral.variable} ${amiri.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh flex flex-col" style={{ fontFamily: "var(--font-spectral), Georgia, serif" }}>
        <NativeShellEnhancements />
        <UISFXProvider>{children}</UISFXProvider>
      </body>
    </html>
  );
}
