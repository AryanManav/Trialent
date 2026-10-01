"use client";

import { useActionState, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { signupAction } from "@/lib/actions/auth";
import { PASSWORD_RULES } from "@/lib/validations/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { UnderlineField } from "@/components/auth/underline-field";
import { StatusBanner } from "@/components/common/status-banner";
import { OAuthButtons, OrDivider } from "@/components/auth/oauth-buttons";
import type { OAuthProviderStatus } from "@/lib/auth/oauth-providers";
import { cn } from "@/lib/utils";

const ASIDE = {
  candidate: {
    eyebrow: "Every project you finish becomes proof.",
    headline: "Your work, your record",
    body: "Finish a paid project and the evaluation stays on your profile — evidence no resume can claim.",
  },
  company: {
    eyebrow: "See the work before you commit to the hire.",
    headline: "Evidence, not guesswork",
    body: "Watch how a candidate actually builds, then decide with a record you can point at.",
  },
} as const;

const ROLES = [
  {
    value: "candidate",
    icon: GraduationCap,
    label: "Candidate",
    hint: "Junior developer",
  },
  { value: "company", icon: Briefcase, label: "Startup", hint: "Hiring manager" },
] as const;

export function SignupForm({ providers }: { providers: OAuthProviderStatus }) {
  const [state, formAction, isPending] = useActionState(signupAction, null);
  const searchParams = useSearchParams();
  const [role, setRole] = useState<"candidate" | "company">(
    searchParams.get("role") === "company" ? "company" : "candidate"
  );
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const callbackFailed = searchParams.get("error") === "oauth_failed";

  useEffect(() => {
    const param = searchParams.get("role");
    if (param === "company" || param === "candidate") setRole(param);
  }, [searchParams]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <AuthShell
      title="Sign up"
      subtitle="Prove ability through real, paid work."
      switchPrompt="Already a member?"
      switchLabel="Sign in"
      switchHref="/login"
      aside={ASIDE[role]}
    >
      <form action={formAction} className="space-y-fib6">
        <input type="hidden" name="role" value={role} />

        {(state?.error || oauthError || callbackFailed) && (
          <StatusBanner tone="error">
            {state?.error ??
              oauthError ??
              "Sign-up with that provider didn't complete. Please try again."}
          </StatusBanner>
        )}

        <fieldset className="space-y-fib4">
          <legend className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            I am joining as
          </legend>
          <div className="grid grid-cols-2 gap-fib5">
            {ROLES.map((option) => {
              const Icon = option.icon;
              const active = role === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setRole(option.value)}
                  className={cn(
                    "flex flex-col items-center rounded-xl border p-fib5 text-sm font-semibold transition-all",
                    active
                      ? "border-brand-600 bg-brand-50 text-brand-900 ring-2 ring-brand-500/20"
                      : "border-line text-ink-600 hover:bg-ink-50"
                  )}
                >
                  <Icon
                    className={cn(
                      "mb-fib3 h-5 w-5",
                      active ? "text-brand-700" : "text-ink-400"
                    )}
                  />
                  {option.label}
                  <span className="text-xs font-normal text-ink-400">{option.hint}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="flex items-start gap-fib4 text-sm text-ink-700">
          <input
            type="checkbox"
            name="acceptTerms"
            required
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong accent-brand-600"
          />
          <span>
            I&apos;m 18 or older and I agree to the{" "}
            <Link href="/terms" target="_blank" className="font-medium underline">
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link href="/privacy" target="_blank" className="font-medium underline">
              Privacy Notice
            </Link>
            .
          </span>
        </label>

        <OAuthButtons
          status={providers}
          role={role}
          disabled={!acceptedTerms}
          onError={setOauthError}
        />
        <OrDivider />

        <div className="space-y-fib6">
          <UnderlineField
            icon={User}
            label="Full name"
            name="fullName"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            state={name.trim().length >= 2 ? "valid" : "idle"}
          />

          <UnderlineField
            icon={Mail}
            label="Email address"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            state={emailValid ? "valid" : "idle"}
          />

          <UnderlineField
            icon={Lock}
            label="Password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            state={
              password.length === 0
                ? "idle"
                : PASSWORD_RULES.every((rule) => rule.test(password))
                  ? "valid"
                  : "active"
            }
          />

          <ul className="space-y-fib3">
            {PASSWORD_RULES.map((rule) => {
              const met = rule.test(password);
              return (
                <li
                  key={rule.id}
                  className={cn(
                    "flex items-center gap-fib4 text-sm transition-colors",
                    met ? "text-emerald-700" : "text-ink-400"
                  )}
                >
                  <span
                    className={cn(
                      "grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
                      met ? "bg-emerald-100 text-emerald-700" : "bg-ink-200 text-ink-400"
                    )}
                  >
                    {met ? "✓" : "•"}
                  </span>
                  {rule.label}
                </li>
              );
            })}
          </ul>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="group flex h-12 w-full items-center justify-center gap-fib4 rounded-full bg-inverse pl-fib7 pr-fib4 font-semibold text-inverse-fg transition-colors hover:bg-inverse/90 disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <span className="flex-1">Create account</span>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-surface/20 transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="h-4 w-4" />
              </span>
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
