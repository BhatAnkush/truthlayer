"use client";

import { type SubmitEvent, useState } from "react"; // Changed FormEvent to SubmitEvent
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    if (result?.ok) {
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6 py-12">
      <Card className="w-full max-w-lg p-6"> {/* Added padding if missing from shadcn base snippet */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-slate-950">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Log in with your email and password or continue with Google.
          </p>
        </div>

        <div className="grid gap-3">
          <Button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full justify-center bg-white text-slate-900 border border-slate-200 hover:bg-slate-100 text-sm font-medium py-2"
          >
            Continue with Google
          </Button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-x-0 top-1/2 border-t border-slate-200" />
          <div className="relative flex justify-center text-sm text-slate-500">
            <span className="bg-white px-3">or log in with email</span>
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button type="submit" className="w-full">
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          New here?{" "}
          <Link
            href="/signup"
            className="font-medium text-slate-950 hover:text-slate-700"
          >
            Create an account
          </Link>
        </p>
      </Card>
    </div>
  );
}