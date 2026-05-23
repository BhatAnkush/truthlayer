import Link from "next/link";
import Image from "next/image";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { LayoutDashboard } from "lucide-react";
import QuotaBadge from "@/components/QuotaBadge";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface">
            <Image
              src="/lightlogo.svg"
              alt="TruthLayer logo"
              width={15}
              height={15}
              className="dark:hidden"
            />
            <Image
              src="/darklogo.svg"
              alt="TruthLayer logo"
              width={15}
              height={15}
              className="hidden dark:block"
            />
          </div>
          <span className="text-sm font-semibold tracking-tight text-text-primary">
            TruthLayer
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Show
            when="signed-in"
            fallback={
              <>
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
                  >
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button
                    type="button"
                    className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-accent-bright"
                  >
                    Sign up
                  </button>
                </SignUpButton>
              </>
            }
          >
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-text-tertiary transition-colors hover:text-text-primary"
            >
              <LayoutDashboard size={13} />
              Dashboard
            </Link>
            <QuotaBadge />
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}
