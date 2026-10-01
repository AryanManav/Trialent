import { z } from "zod";

/**
 * The signup form renders this exact array as its live checklist, and the
 * schema below validates against the same predicates — so the rules shown to
 * the user can never drift from the rules actually enforced.
 */
export const PASSWORD_RULES = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (value: string) => value.length >= 8,
  },
  {
    id: "numberOrSymbol",
    label: "At least one number (0–9) or a symbol",
    test: (value: string) => /[\d\W_]/.test(value),
  },
  {
    id: "letterCase",
    label: "Lowercase (a–z) and uppercase (A–Z)",
    test: (value: string) => /[a-z]/.test(value) && /[A-Z]/.test(value),
  },
] as const;

/** Existing accounts predate the stronger rules, so sign-in stays permissive. */
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Please enter your password"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const strongPassword = PASSWORD_RULES.reduce(
  (schema, rule) => schema.refine(rule.test, { message: rule.label }),
  z.string() as z.ZodType<string>
);

export const signupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  password: strongPassword,
  role: z.enum(["candidate", "company"], {
    errorMap: () => ({ message: "Please select either Candidate or Company" }),
  }),
  acceptTerms: z.literal("on", {
    errorMap: () => ({
      message: "Please confirm you're 18 or older and agree to the Terms",
    }),
  }),
});

export type SignupInput = z.infer<typeof signupSchema>;
