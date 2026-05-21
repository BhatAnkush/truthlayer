"use client";

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect_url") ?? "/";
  const redirectUrl = rawRedirect.startsWith("/") ? rawRedirect : "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <SignIn
        forceRedirectUrl={redirectUrl}
        fallbackRedirectUrl={redirectUrl}
      />
    </div>
  );
}
