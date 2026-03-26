// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter, Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "./provider";
import ClientLayout from "@/components/ClientLayout";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Mission Control",
  description: "OpenClaw agent dashboard",
  // PWA / Apple
  appleWebApp: {
    capable: true,
    title: "Mission Control",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#0E0B09",
  // Prevents iOS from zooming on input focus
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

/**
 * iOS PWA Link Interceptor
 *
 * Problem: In iOS standalone PWA mode, any navigation that WebKit considers
 * a "new document load" breaks out of the standalone shell and opens Safari
 * (showing the X button, URL bar, and bottom toolbar the user sees).
 *
 * This script runs synchronously before React hydrates. It intercepts all
 * <a> clicks that point to same-origin URLs and uses history.pushState
 * instead of letting the browser navigate, keeping the PWA shell alive.
 *
 * It ONLY runs when navigator.standalone === true (iOS PWA), so it has
 * zero effect in Safari browser or any other platform.
 */
const iosPwaNavigationScript = `
(function() {
  if (!window.navigator.standalone) return;

  document.addEventListener('click', function(e) {
    var target = e.target;

    // Walk up the DOM to find an <a> tag
    while (target && target.tagName !== 'A') {
      target = target.parentElement;
    }

    if (!target) return;

    var href = target.getAttribute('href');
    if (!href) return;

    // Only intercept same-origin, non-hash, non-external links
    var isSameOrigin = (
      href.startsWith('/') ||
      href.startsWith(window.location.origin)
    );
    var isHash = href.startsWith('#');
    var hasTarget = target.getAttribute('target');

    if (isSameOrigin && !isHash && !hasTarget) {
      e.preventDefault();
      var url = href.startsWith('/') ? href : href.replace(window.location.origin, '');
      window.location.href = url;
    }
  }, true);
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* iOS PWA link interceptor — must run before React hydration */}
        <script dangerouslySetInnerHTML={{ __html: iosPwaNavigationScript }} />
      </head>
      <body
        className={cn(
          inter.variable,
          sora.variable,
          jetbrainsMono.variable,
          "min-h-screen"
        )}
        style={{
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
          fontFamily: "var(--font-body)",
        }}
        suppressHydrationWarning
      >
        <Providers>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  );
}