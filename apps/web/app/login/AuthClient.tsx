"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@speckyai/ui/components/ui/button";
import { Input } from "@speckyai/ui/components/ui/input";
import { Label } from "@speckyai/ui/components/ui/label";

import { createSupabaseBrowserClient } from "../../lib/supabaseClient";
import { getPublicEnv } from "../../lib/env";

type Tab = "login" | "signup";

const FEATURES = [
  "Real-time meeting transcription",
  "AI-generated summaries & notes",
  "Automatic action item tracking",
];

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function AuthClient({ defaultTab = "login" }: { defaultTab?: Tab }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";

  const [tab, setTab] = useState<Tab>(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function switchTab(t: Tab) {
    setTab(t);
    setError(null);
    setPassword("");
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace(nextPath);
  }

  async function onSignup(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const env = getPublicEnv();
    const redirectTo = `${env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/verify-email`;

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });

    setIsLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    router.replace("/verify-email");
  }

  async function onGoogleSignIn() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: brand panel (desktop only) */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-[#5b47d6] to-[#7c6af7] flex-col justify-between p-12 text-white">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <span className="text-white font-bold text-lg tracking-tight">S</span>
            </div>
            <span className="text-2xl font-semibold tracking-tight">SpeckyAI</span>
          </div>

          <h1 className="text-4xl font-bold leading-snug mb-4">
            Transform your meetings with AI
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            Automatically transcribe, summarize, and extract action items from every meeting — so
            your team can focus on what matters.
          </p>
        </div>

        {/* Feature list */}
        <ul className="space-y-4">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <CheckIcon />
              </span>
              <span className="text-white/90 text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Right: form panel */}
      <div className="flex-1 flex items-center justify-center bg-[#f8f9fc] px-4 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 bg-[#5b47d6] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-base">S</span>
            </div>
            <span className="text-xl font-semibold text-slate-800">SpeckyAI</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            {/* Tab switcher */}
            <div className="flex bg-slate-100 rounded-xl p-1 mb-8">
              <button
                type="button"
                onClick={() => switchTab("login")}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-150 ${
                  tab === "login"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => switchTab("signup")}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-150 ${
                  tab === "signup"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Create account
              </button>
            </div>

            {/* Form */}
            <form onSubmit={tab === "login" ? onLogin : onSignup} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {tab === "login" && (
                    <button
                      type="button"
                      className="text-xs text-[#5b47d6] hover:text-[#4a38c0] hover:underline underline-offset-4 transition-colors"
                      onClick={() => router.push("/reset-password")}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={tab === "login" ? "current-password" : "new-password"}
                  placeholder={tab === "signup" ? "At least 8 characters" : ""}
                  minLength={tab === "signup" ? 8 : undefined}
                />
              </div>

              {error ? (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                className="w-full bg-[#5b47d6] hover:bg-[#4a38c0] text-white font-medium"
                disabled={isLoading}
              >
                {isLoading
                  ? tab === "login"
                    ? "Logging in…"
                    : "Creating account…"
                  : tab === "login"
                    ? "Log in"
                    : "Create account"}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 tracking-wider">
                  or continue with
                </span>
              </div>
            </div>

            {/* Google OAuth */}
            <button
              type="button"
              onClick={onGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </div>

          {/* Legal */}
          <p className="mt-6 text-center text-xs text-slate-400 leading-relaxed">
            By continuing, you agree to our{" "}
            <a href="#" className="underline underline-offset-4 hover:text-slate-600 transition-colors">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="underline underline-offset-4 hover:text-slate-600 transition-colors">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
