import { z } from "zod";

// ============================================================================
// AUTH SCHEMAS - Dùng chung cho Client & API
// ============================================================================

/**
 * Email validation - supports .edu.vn domains
 */
export const emailSchema = z
  .string()
  .min(1, "EMAIL_REQUIRED")
  .email("EMAIL_INVALID_FORMAT")
  .max(255, "EMAIL_TOO_LONG");

/**
 * Password validation
 * - Min 8 chars
 * - At least 1 uppercase, 1 lowercase, 1 number
 */
export const passwordSchema = z
  .string()
  .min(8, "PASSWORD_TOO_SHORT")
  .max(100, "PASSWORD_TOO_LONG")
  .regex(/[A-Z]/, "PASSWORD_MISSING_UPPERCASE")
  .regex(/[a-z]/, "PASSWORD_MISSING_LOWERCASE")
  .regex(/[0-9]/, "PASSWORD_MISSING_NUMBER");

/**
 * Sign In Request
 */
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "PASSWORD_REQUIRED"),
});

/**
 * Sign Up Request
 */
export const signUpSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "CONFIRM_PASSWORD_REQUIRED"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "PASSWORDS_DO_NOT_MATCH",
    path: ["confirmPassword"],
  });

/**
 * OAuth Consent - Required for PDPD compliance
 */
export const oauthConsentSchema = z.object({
  provider: z.enum(["google"]),
  consentTerms: z.literal(true, {
    errorMap: () => ({ message: "CONSENT_REQUIRED" }),
  }),
  consentPrivacy: z.literal(true, {
    errorMap: () => ({ message: "CONSENT_REQUIRED" }),
  }),
});

// ============================================================================
// TYPES
// ============================================================================

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type OAuthConsentInput = z.infer<typeof oauthConsentSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export function validateSignIn(data: unknown) {
  return signInSchema.safeParse(data);
}

export function validateSignUp(data: unknown) {
  return signUpSchema.safeParse(data);
}

export function validateOAuthConsent(data: unknown) {
  return oauthConsentSchema.safeParse(data);
}
