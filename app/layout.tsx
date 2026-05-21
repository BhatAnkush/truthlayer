import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "TruthLayer — See what the article is really saying",
  description:
    "TruthLayer uses AI to dissect any news article — separating facts from opinions, spotting logical fallacies, and measuring manipulation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark h-full ${inter.variable}`}>
      <body className="min-h-full flex flex-col bg-gray-950 font-sans antialiased">
        <ClerkProvider>
          <header className="flex items-center justify-end gap-3 border-b border-gray-800 px-4 py-3 sm:px-6">
            <Show when="signed-out">
              <SignInButton>
                <button className="rounded-lg border border-gray-700 px-4 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-gray-500 hover:text-gray-100">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton>
                <button className="rounded-lg bg-gray-100 px-4 py-1.5 text-xs font-semibold text-gray-900 transition-colors hover:bg-white">
                  Sign up
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
