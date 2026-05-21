import { Inter } from "next/font/google";
import Image from "next/image";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  Show,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`dark h-full ${inter.variable}`}>
        <body className="min-h-full flex flex-col bg-background font-sans antialiased selection:bg-primary/20 selection:text-primary">
          {/* Top Navbar */}
          <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl h-14 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
              {/* Logo / Home Link */}
              <a
                href="/"
                className="flex items-center gap-2.5 text-sm font-semibold text-foreground tracking-tight hover:opacity-90 transition-opacity"
              >
                <div className="relative h-6 w-6 flex items-center justify-center">
                  <Image
                    src="/logo.svg"
                    alt="TruthLayer Logo"
                    fill
                    priority
                    className="object-contain"
                  />
                </div>
                <span className="font-bold tracking-tight">TruthLayer</span>
              </a>

              {/* Navigation Actions */}
              <div className="flex items-center gap-4">
                {/* 1. What to show when the user is Signed Out */}
                <Show
                  when="signed-in"
                  fallback={
                    <div className="flex items-center gap-4">
                      <SignInButton mode="modal">
                        <button className="rounded-md border border-input bg-transparent px-3.5 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-muted hover:text-white cursor-pointer">
                          Sign in
                        </button>
                      </SignInButton>

                      <SignUpButton mode="modal">
                        <button className="rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 cursor-pointer">
                          Sign up
                        </button>
                      </SignUpButton>
                    </div>
                  }
                >
                  {/* 2. What to show when the user is Signed In */}
                  <a
                    href="/dashboard"
                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mr-1"
                  >
                    Dashboard
                  </a>

                  <div className="flex items-center justify-center border border-border p-0.5 rounded-full bg-card">
                    <UserButton
                      appearance={{
                        elements: {
                          avatarBox: "h-6 w-6",
                        },
                      }}
                    />
                  </div>
                </Show>
              </div>
            </div>
          </header>

          {/* Core Main Viewport Context */}
          <main className="flex-1 flex flex-col">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
