"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import { loginAction } from "@/lib/actions/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { UnderlineField } from "@/components/auth/underline-field";
import { OAuthButtons, OrDivider } from "@/components/auth/oauth-buttons";
import { StatusBanner } from "@/components/common/status-banner";
import type { OAuthProviderStatus } from "@/lib/auth/oauth-providers";

/** Errors the auth callback reports back via ?error=. */
const CALLBACK_ERRORS: Record<string, string> = {
  auth_callback_failed: "Sign-in didn't complete. Please try again.",
  oauth_failed: "Sign-in with that provider didn't complete. Please try again.",
};

export function LoginForm({ providers }: { providers: OAuthProviderStatus }) {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const redirect = searchParams.get("redirect") || "";
  const callbackError = CALLBACK_ERRORS[searchParams.get("error") ?? ""];
  const error = state?.error ?? oauthError ?? callbackError;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Pick up where your evaluations left off."
      switchPrompt="New to Trialent?"
      switchLabel="Create an account"
      switchHref="/signup"
      aside={{
        eyebrow: "Decisions backed by work you can inspect.",
        headline: "Evidence, not guesswork",
        body: "Every completed project leaves a record — for the candidate who built it and the startup who reviewed it.",
      }}
    >
      <div className="space-y-fib7">
        {error && <StatusBanner tone="error">{error}</StatusBanner>}

        <OAuthButtons
          status={providers}
          next={redirect || undefined}
          onError={setOauthError}
        />
        <p className="text-center text-xs text-ink-500">
          By continuing with Google or GitHub you agree to the{" "}
          <Link href="/terms" className="underline underline-offset-2">
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy Notice
          </Link>
          .
        </p>
        <OrDivider />

        <form action={formAction} className="space-y-fib7">
          <input type="hidden" name="redirect" value={redirect} />

          <div className="space-y-fib6">
            <UnderlineField
              icon={Mail}
              label="Email address"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
            <UnderlineField
              icon={Lock}
              label="Password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="group flex h-12 w-full items-center justify-center gap-fib4 rounded-full bg-brand-600 pl-fib7 pr-fib4 font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <span className="flex-1">Sign in</span>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-surface/20 transition-transform group-hover:translate-x-0.5">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-ink-400">
          Joining as a startup?{" "}
          <Link
            href="/signup?role=company"
            className="font-semibold text-brand-700 underline underline-offset-4"
          >
            Create a company account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
