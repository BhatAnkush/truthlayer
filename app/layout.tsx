import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { DM_Sans, JetBrains_Mono, Playfair_Display } from "next/font/google";
import Image from "next/image";
import { Mail, FileSearch, Code2 } from "lucide-react";import Navbar from "@/components/Navbar";
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
            <footer className="border-t border-border-subtle px-4 py-10 sm:px-6">
              <div className="mx-auto w-full max-w-7xl">
                {/* Tagline */}
                <p className="font-display text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight mb-8 max-w-sm italic">
                  "Facts don't lie.
                  <br />
                  <span className="text-accent not-italic font-normal text-xl sm:text-2xl">
                    But articles sometimes do.
                  </span>
                  "
                </p>

                {/* Bottom bar */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left — logo + copyright */}
                  <div className="flex items-center gap-3">
                    <Image
                      src="/lightlogo.svg"
                      alt="TruthLayer"
                      width={16}
                      height={16}
                      className="dark:hidden opacity-60"
                    />
                    <Image
                      src="/darklogo.svg"
                      alt="TruthLayer"
                      width={16}
                      height={16}
                      className="hidden dark:block opacity-60"
                    />
                    <span className="font-mono text-[10px] text-text-muted tracking-wide">
                      © {new Date().getFullYear()} TruthLayer
                    </span>
                    <span className="text-border h-3 w-px bg-border-subtle" />
                    <div className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.15em] text-accent-dim">
                      <FileSearch size={11} />
                      Analyse responsibly
                    </div>
                  </div>

                  {/* Right — links */}
                  {/* Right — links */}
                  <div className="flex items-center gap-4">
                    <a
                      href="https://github.com/BhatAnkush"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 font-mono text-[10px] text-text-muted hover:text-text-secondary tracking-wide transition-colors group"
                    >
                    <Code2 size={12} className="group-hover:text-accent transition-colors" />
                      GitHub
                    </a>
                    <a
                      href="mailto:ankushbhataab@gmail.com"
                      className="flex items-center gap-1.5 font-mono text-[10px] text-text-muted hover:text-text-secondary tracking-wide transition-colors group"
                    >
                      <Mail
                        size={12}
                        className="group-hover:text-accent transition-colors"
                      />
                      Contact
                    </a>
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
