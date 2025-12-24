/**
 * Worker Environment Configuration with Zod Validation
 * Rule 2: Use Zod for all env and input validations
 * Fail Fast: Worker crashes immediately if env is invalid
 */
import { z } from "zod";
import dotenv from "dotenv";

// Load .env BEFORE validation
dotenv.config();

/**
 * Worker Environment Schema
 */
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Supabase (Required)
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  // Redis (Required for worker)
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // Gemini AI (Required for OCR/Moderation)
  GEMINI_API_KEY: z
    .string()
    .min(1, "GEMINI_API_KEY is required for AI features"),
});

/**
 * Parse and validate environment variables
 * This will throw immediately if validation fails (Fail Fast)
 */
const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables for Worker:");
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
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
