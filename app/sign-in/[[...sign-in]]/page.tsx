"use client";

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignInContent() {
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect_url") ?? "/";
  const redirectUrl = rawRedirect.startsWith("/") ? rawRedirect : "/";

  return (
    <SignIn forceRedirectUrl={redirectUrl} fallbackRedirectUrl={redirectUrl} />
  );
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Suspense fallback={null}>
        <SignInContent />
      </Suspense>
    </div>
  );
}
