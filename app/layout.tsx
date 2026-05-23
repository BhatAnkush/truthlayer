import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { DM_Sans, JetBrains_Mono, Playfair_Display } from "next/font/google";
import Image from "next/image";
import { FileSearch } from "lucide-react";
import Navbar from "@/components/Navbar";
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
            <footer className="border-t border-border-subtle bg-background-subtle/70 px-4 py-8 sm:px-6">
              <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Image
                    src="/lightlogo.svg"
                    alt="TruthLayer logo"
                    width={18}
                    height={18}
                    className="h-4.5 w-4.5 dark:hidden"
                  />
                  <Image
                    src="/darklogo.svg"
                    alt="TruthLayer logo"
                    width={18}
                    height={18}
                    className="hidden h-4.5 w-4.5 dark:block"
                  />
                  <span>TruthLayer</span>
                  <span className="text-text-tertiary">
                    Editorial AI verification
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-text-tertiary">
                  <div className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.18em] text-accent-dim">
                    <FileSearch size={14} />
                    Analyze responsibly
                  </div>
                  <span>© {new Date().getFullYear()}</span>
                </div>
              </div>
            </footer>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
