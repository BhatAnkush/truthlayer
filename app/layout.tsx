import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { DM_Sans, JetBrains_Mono, Playfair_Display } from "next/font/google";
import Image from "next/image";
import { FileSearch } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://truthlayer.app"),
  title: {
    default: "TruthLayer",
    template: "%s | TruthLayer",
  },
  description:
    "AI-powered media analysis with evidence mapping and manipulation scoring.",
  openGraph: {
    type: "website",
    title: "TruthLayer",
    description:
      "AI-powered media analysis with evidence mapping and manipulation scoring.",
    siteName: "TruthLayer",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "TruthLayer social preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TruthLayer",
    description:
      "AI-powered media analysis with evidence mapping and manipulation scoring.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [
      {
        media: "(prefers-color-scheme: light)",
        url: "/lightlogo.svg",
      },
      {
        media: "(prefers-color-scheme: dark)",
        url: "/darklogo.svg",
      },
    ],
    shortcut: [
      {
        media: "(prefers-color-scheme: light)",
        url: "/lightlogo.svg",
      },
      {
        media: "(prefers-color-scheme: dark)",
        url: "/darklogo.svg",
      },
    ],
    apple: "/lightlogo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={`h-full ${playfair.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
      >
        <body className="flex min-h-full flex-col bg-background font-sans text-text-primary antialiased selection:bg-accent-subtle selection:text-text-primary">
          <ThemeProvider>
            <Navbar />
            <main className="flex flex-1 flex-col">{children}</main>
            <Toaster />
            <footer className="border-t border-border-subtle bg-background-subtle/50 px-4 pt-12 pb-8 sm:px-6">
              <div className="mx-auto w-full max-w-7xl">
                {/* Top row */}
                <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between pb-8 border-b border-border-subtle">
                  {/* Brand block */}
                  <div className="flex flex-col gap-3 max-w-xs">
                    <div className="flex items-center gap-2">
                      <Image
                        src="/lightlogo.svg"
                        alt="TruthLayer logo"
                        width={20}
                        height={20}
                        className="dark:hidden"
                      />
                      <Image
                        src="/darklogo.svg"
                        alt="TruthLayer logo"
                        width={20}
                        height={20}
                        className="hidden dark:block"
                      />
                      <span className="font-sans font-semibold text-sm text-text-primary tracking-tight">
                        TruthLayer
                      </span>
                    </div>
                    <p className="text-xs text-text-tertiary leading-relaxed font-light">
                      AI-powered media analysis. Separate facts from opinions,
                      spot manipulation, and see what articles are really
                      saying.
                    </p>
                    <div className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-accent-dim">
                      <FileSearch size={12} />
                      Analyse responsibly
                    </div>
                  </div>

                  {/* Links block */}
                  <div className="flex flex-col gap-2">
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted mb-1">
                      Built by
                    </p>
                    <a
                      href="https://github.com/BhatAnkush"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 group"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="text-text-tertiary group-hover:text-accent transition-colors"
                      >
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                      BhatAnkush
                    </a>
                    <a
                      href="mailto:ankushbhataab@gmail.com"
                      className="text-xs text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 group"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-text-tertiary group-hover:text-accent transition-colors"
                      >
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                      ankushbhataab@gmail.com
                    </a>
                  </div>
                </div>

                {/* Bottom row */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-5">
                  <p className="font-mono text-[10px] text-text-muted tracking-wide">
                    © {new Date().getFullYear()} TruthLayer. All rights
                    reserved.
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-text-muted tracking-wide">
                      Powered by
                    </span>
                    <span className="font-mono text-[10px] font-medium text-accent-dim tracking-wide">
                      Groq · Llama 3.3 70B
                    </span>
                    <span className="h-1 w-1 rounded-full bg-accent animate-pulse" />
                  </div>
                </div>
              </div>
            </footer>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
