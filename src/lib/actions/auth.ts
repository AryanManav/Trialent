"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loginSchema, signupSchema } from "@/lib/validations";
import { dashboardFor, resolveUserRole } from "@/lib/constants";
import type { UserRole } from "@/lib/types/database.types";
import type { AuthState } from "@/lib/types/actions";
import { isInternalPath } from "@/lib/utils";

/** Only same-origin paths are safe to bounce back to after login. */
function safeRedirectTarget(value: string | null): string | null {
  if (!isInternalPath(value)) return null;
  if (value.startsWith("/login") || value.startsWith("/signup")) return null;
  return value;
}

export async function loginAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const validated = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: validated.data.email,
    password: validated.data.password,
  });

  if (error || !data.user) {
    return { error: error?.message || "Invalid email or password" };
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  const role = resolveUserRole(
    dbUser?.role as UserRole | undefined,
    data.user.user_metadata?.role
  );

  redirect(
    safeRedirectTarget(formData.get("redirect") as string | null) ?? dashboardFor(role)
  );
}

export async function signupAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const validated = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: validated.data.email,
    password: validated.data.password,
    options: {
      data: {
        full_name: validated.data.fullName,
        role: validated.data.role,
      },
    },
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: "Failed to create account. Please try again." };

  // The auth trigger normally creates these rows; this backfills if it lags.
  try {
    const admin = createAdminClient();
    await admin.from("users").upsert({
      id: data.user.id,
      email: validated.data.email,
      full_name: validated.data.fullName,
      role: validated.data.role,
      email_verified: !!data.user.email_confirmed_at,
    });

    if (validated.data.role === "candidate") {
      await admin.from("candidate_profiles").upsert({ user_id: data.user.id });
    }
  } catch (err) {
    console.error("Admin user sync fallback error:", err);
  }

  redirect(dashboardFor(validated.data.role));
}
