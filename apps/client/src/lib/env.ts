/**
 * Client Environment Configuration with Zod Validation
 * Rule 2: Use Zod for all env and input validations
 *
 * Note: For Next.js, public env vars must be prefixed with NEXT_PUBLIC_
 * This validation runs at build time and runtime
 */
import { z } from "zod";

/**
 * Client Environment Schema
 * Only NEXT_PUBLIC_ variables are accessible in browser
 */
const envSchema = z.object({
  // Supabase (Required)
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),

  // API Server
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:4000"),

  // R2 Public Domain (Optional)
  NEXT_PUBLIC_R2_PUBLIC_DOMAIN: z.string().optional(),
});

/**
 * Parse and validate environment variables
 */
const parseEnv = () => {
  const result = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_R2_PUBLIC_DOMAIN: process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN,
  });

  if (!result.success) {
    console.error("❌ Invalid environment variables for Client:");
    console.error(result.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }

  return result.data;
};

/**
 * Validated environment object
 * ALWAYS use this instead of process.env directly
 */
export const env = parseEnv();

/**
 * Type for the environment
 */
export type Env = z.infer<typeof envSchema>;
