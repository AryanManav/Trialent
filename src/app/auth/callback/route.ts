import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { githubUsernameOf } from "@/lib/data/candidate";
import { recordActivity } from "@/lib/data/activity";
import {
  CANDIDATE_ACTIVITY_TYPES,
  OAUTH_INTENT_COOKIE,
  dashboardFor,
  resolveUserRole,
} from "@/lib/constants";
import type { UserRole } from "@/lib/types/database.types";
import { isInternalPath } from "@/lib/utils";

/** Only same-origin paths may be used as the post-callback destination. */
function safeNext(value: string | null): string | null {
  return isInternalPath(value) ? value : null;
}

function withParam(path: string, key: string, value: string): string {
  const url = new URL(path, "http://placeholder");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

/**
 * Every return trip from Supabase Auth lands here: social sign-in and sign-up
 * (intent=login|signup), GitHub account linking (github=1), and email
 * confirmation links (no extra params).
 */
/** The sign-up role and destination the OAuth buttons stored before leaving. */
function readIntentCookie(request: NextRequest): {
  intent?: string;
  role?: string;
  next?: string;
} {
  const raw = request.cookies.get(OAUTH_INTENT_COOKIE)?.value;
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (!parsed || typeof parsed !== "object") return {};
    const { intent, role, next } = parsed as Record<string, unknown>;
    return {
      intent: typeof intent === "string" ? intent : undefined,
      role: typeof role === "string" ? role : undefined,
      next: typeof next === "string" ? next : undefined,
    };
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const stored = readIntentCookie(request);
  const code = searchParams.get("code");
  // Query params win (older links, GitHub linking); the cookie covers OAuth.
  const next = safeNext(searchParams.get("next") ?? stored.next ?? null);
  const intent = searchParams.get("intent") ?? stored.intent ?? null;
  const requestedRole =
    (searchParams.get("role") ?? stored.role) === "company" ? "company" : "candidate";
  const linkingGithub = searchParams.get("github") === "1";

  // Every response clears the one-shot intent cookie.
  const go = (path: string) => {
    const response = NextResponse.redirect(`${origin}${path}`);
    response.cookies.delete(OAUTH_INTENT_COOKIE);
    return response;
  };

  // Send each flow back to where it started rather than to a generic error.
  const fail = () => {
    if (linkingGithub)
      return go(withParam(next ?? "/candidate/profile", "github", "failed"));
    if (intent === "signup")
      return go(`/signup?error=oauth_failed&role=${requestedRole}`);
    if (intent === "login") return go("/login?error=oauth_failed");
    return go("/login?error=auth_callback_failed");
  };

  // A provider or Supabase refusing the request arrives as ?error=… with no code.
  if (!code) return fail();

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail();

  // OAuth cannot carry the role chosen on the sign-up form, so the account was
  // created as a candidate. The database only honours this for a brand-new
  // account; for anyone else it is a no-op.
  if (intent === "signup" && requestedRole === "company") {
    const { error: roleError } = await supabase.rpc("claim_signup_role", {
      requested_role: "company",
    });
    if (roleError) console.error("claim_signup_role failed:", roleError.message);
  }

  const username = githubUsernameOf(user);
  if (username) {
    // Explicit linking replaces whatever was typed; a GitHub sign-in only
    // fills the field when it is empty.
    let update = supabase
      .from("candidate_profiles")
      .update({ github_url: `https://github.com/${username}` })
      .eq("user_id", user.id);
    if (!linkingGithub) update = update.is("github_url", null);

    const { data: profile } = await update.select("id").maybeSingle();
    if (profile) {
      await recordActivity(
        supabase,
        profile.id,
        CANDIDATE_ACTIVITY_TYPES.githubConnected
      );
    }
  } else if (linkingGithub) {
    return fail();
  }

  if (linkingGithub) {
    return go(withParam(next ?? "/candidate/profile", "github", "linked"));
  }
  if (next) return go(next);

  const { data: account } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return go(dashboardFor(resolveUserRole(account?.role as UserRole | undefined, null)));
}
