"use client";

import { useState } from "react";
import { Github, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  OAUTH_INTENT_COOKIE,
  OAUTH_INTENT_MAX_AGE_SECONDS,
  OAUTH_PROVIDERS,
  type OAuthProviderId,
} from "@/lib/constants";
import type { OAuthProviderStatus } from "@/lib/auth/oauth-providers";
import { cn } from "@/lib/utils";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

const ICONS: Record<OAuthProviderId, () => React.ReactNode> = {
  google: () => <GoogleMark />,
  github: () => <Github className="h-5 w-5 text-ink-900" />,
};

/**
 * Social sign-in. OAuth cannot carry sign-up metadata the way the email form
 * does, so the chosen role (and where to go afterwards) rides in a short-lived
 * cookie that /auth/callback reads — see OAUTH_INTENT_COOKIE.
 */
export function OAuthButtons({
  status,
  role,
  next,
  disabled = false,
  onError,
}: {
  status: OAuthProviderStatus;
  /** Sign-up keeps these off until the Terms box is ticked. */
  disabled?: boolean;
  /** Present on sign-up: the role the new account should get. */
  role?: "candidate" | "company";
  /** Present on sign-in: where to go afterwards. */
  next?: string;
  onError: (message: string | null) => void;
}) {
  const [pending, setPending] = useState<OAuthProviderId | null>(null);
  const unavailable = OAUTH_PROVIDERS.filter((provider) => !status[provider.id]);

  const start = async (provider: OAuthProviderId) => {
    setPending(provider);
    onError(null);

    const intent = { intent: role ? "signup" : "login", role, next };
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${OAUTH_INTENT_COOKIE}=${encodeURIComponent(
      JSON.stringify(intent)
    )}; Path=/; Max-Age=${OAUTH_INTENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;

    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      // No query string: an exact `/auth/callback` allow-list entry matches.
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    // On success the browser is already navigating away.
    if (error) {
      onError("We couldn't reach that provider. Please try again.");
      setPending(null);
    }
  };

  return (
    <div className="space-y-fib4">
      <div className="grid grid-cols-2 gap-fib4">
        {OAUTH_PROVIDERS.map((provider) => {
          const enabled = status[provider.id];
          return (
            <button
              key={provider.id}
              type="button"
              disabled={!enabled || disabled || pending !== null}
              onClick={() => start(provider.id)}
              aria-label={`Continue with ${provider.label}`}
              title={
                enabled
                  ? `Continue with ${provider.label}`
                  : `${provider.label} sign-in isn't set up yet`
              }
              className={cn(
                "flex h-12 items-center justify-center gap-fib3 rounded-full border border-line text-sm font-semibold text-ink-700 transition-colors",
                enabled && !disabled
                  ? "hover:border-ink-300 hover:bg-ink-50"
                  : "cursor-not-allowed opacity-40"
              )}
            >
              {pending === provider.id ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                ICONS[provider.id]()
              )}
              <span className="hidden sm:inline">{provider.label}</span>
            </button>
          );
        })}
      </div>

      {unavailable.length > 0 && (
        <p className="text-center text-xs text-ink-400">
          {unavailable.map((provider) => provider.label).join(", ")} sign-in isn&rsquo;t
          available yet.
        </p>
      )}
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-fib5 text-xs font-medium uppercase tracking-wider text-ink-400">
      <span className="h-px flex-1 bg-line" />
      or
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
