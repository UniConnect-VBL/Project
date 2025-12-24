/**
 * Environment Configuration with Zod Validation
 * Rule 2: Use Zod for all env and input validations
 * Fail Fast: App crashes immediately if env is invalid
 */
import { z } from "zod";
import dotenv from "dotenv";

// Load .env BEFORE validation
dotenv.config();

/**
 * Environment Schema
 * All required and optional environment variables for the API
 */
const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  // Supabase (Required)
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  // Redis (Optional - has default)
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // Cloudflare R2 (Optional for local dev)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().default("unihood-files"),
  R2_PUBLIC_DOMAIN: z.string().optional(),
});

/**
 * Parse and validate environment variables
 * This will throw immediately if validation fails (Fail Fast)
 */
const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }

  return result.data;
};

/**
 * Validated environment object
 * ALWAYS use this instead of process.env directly
 */
const parsedEnv = parseEnv();

/**
 * Validated environment object with computed properties
 * ALWAYS use this instead of process.env directly
 */
export const env = {
  ...parsedEnv,
  /** R2 endpoint URL (derived from account ID) */
  get R2_ENDPOINT(): string | undefined {
    return parsedEnv.R2_ACCOUNT_ID
      ? `https://${parsedEnv.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : undefined;
  },
  /** R2 public URL for accessing uploaded files */
  get R2_PUBLIC_URL(): string | undefined {
    return parsedEnv.R2_PUBLIC_DOMAIN
      ? `https://${parsedEnv.R2_PUBLIC_DOMAIN}`
      : undefined;
  },
  /** Check if R2 is fully configured */
  get isR2Configured(): boolean {
    return !!(
      parsedEnv.R2_ACCOUNT_ID &&
      parsedEnv.R2_ACCESS_KEY_ID &&
      parsedEnv.R2_SECRET_ACCESS_KEY
    );
  },
};

/**
 * Type for the environment
 */
export type Env = z.infer<typeof envSchema> & {
  R2_ENDPOINT: string | undefined;
  R2_PUBLIC_URL: string | undefined;
  isR2Configured: boolean;
};
