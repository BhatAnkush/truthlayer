"use client";

import { type SubmitEvent, useState } from "react"; // Changed FormEvent to SubmitEvent
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Unable to create account.");
      return;
    }

    const signInResult = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (signInResult?.error) {
      setError(signInResult.error || "Account created but sign-in failed.");
      return;
    }

    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6 py-12">
      <Card className="w-full max-w-lg p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-slate-950">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign up with email/password or continue with Google.
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
            <span className="bg-white px-3">or sign up with email</span>
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
            />
          </div>

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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Create a password"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button type="submit" className="w-full">
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-slate-950 hover:text-slate-700"
          >
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
}