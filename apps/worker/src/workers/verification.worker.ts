/**
 * Verification Worker - OCR Processing with Gemini
 *
 * Rule 5:
 * - AI Retry Logic: Exponential Backoff (2s → 4s → 8s → 16s → 32s)
 * - DLQ: Failed jobs after 5 retries → Dead Letter Queue
 * - Concurrency: Max 5 concurrent jobs to avoid Gemini rate limit
 */

import { Worker, Job } from "bullmq";
import { redisConnection, dlqQueue, defaultJobOptions } from "../queue.js";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../env.js";

// Initialize clients
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

interface VerificationJobData {
  userId: string;
  imageUrl: string;
}

interface OCRResult {
  studentCode?: string;
  fullName?: string;
  school?: string;
}

/**
 * Extract student info from ID card image using Gemini
 */
async function performOCR(imageUrl: string): Promise<OCRResult> {
  const prompt = `
    Analyze this student ID card image and extract:
    1. Student code (MSSV) - usually 8-10 digits
    2. Full name
    3. School/University name
    
    Return ONLY a JSON object in this exact format:
    {"studentCode": "...", "fullName": "...", "school": "..."}
    
    If any field cannot be found, use null for that field.
  `;

  // Fetch image and convert to base64
  const response = await fetch(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = response.headers.get("content-type") || "image/jpeg";

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType,
        data: base64,
      },
    },
  ]);

  const text = result.response.text();

  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse OCR result");
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Verification Worker with concurrency limit and DLQ
 */
const verificationWorker = new Worker<VerificationJobData>(
  "verification",
  async (job: Job<VerificationJobData>) => {
    const { userId, imageUrl } = job.data;
    console.log(`🔍 Processing verification job ${job.id} for user ${userId}`);

    try {
      // Perform OCR
      const ocrResult = await performOCR(imageUrl);

      // Validate student code format
      const studentCodeRegex = /^[A-Za-z0-9]{6,12}$/;
      const isValidCode =
        ocrResult.studentCode && studentCodeRegex.test(ocrResult.studentCode);

      if (isValidCode && ocrResult.fullName) {
        // Find matching school
        const { data: school } = await supabase
          .from("schools")
          .select("id, name")
          .ilike("name", `%${ocrResult.school || ""}%`)
          .single();

        // Update user verification
        await supabase
          .from("users")
          .update({
            is_verified: true,
            verification_status: "approved",
            student_code: ocrResult.studentCode,
            full_name: ocrResult.fullName || undefined,
            school_id: school?.id || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        // Update verification proof
        await supabase
          .from("verification_proofs")
          .update({
            status: "approved",
            extracted_data: ocrResult,
          })
          .eq("user_id", userId)
          .eq("status", "pending");

        console.log(`✅ Verification approved for user ${userId}`);
      } else {
        // Reject verification
        await supabase
          .from("users")
          .update({
            verification_status: "rejected",
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        await supabase
          .from("verification_proofs")
          .update({
            status: "rejected",
            rejected_reason: "Could not extract valid student information",
            extracted_data: ocrResult,
          })
          .eq("user_id", userId)
          .eq("status", "pending");

        console.log(`❌ Verification rejected for user ${userId}`);
      }

      return { success: true, result: ocrResult };
    } catch (error) {
      console.error(`Error in verification job ${job.id}:`, error);
      throw error; // Let BullMQ handle retry
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Max 5 concurrent jobs
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000, // Per minute (adjust based on Gemini tier)
    },
  }
);

// Handle failed jobs after all retries
verificationWorker.on("failed", async (job, error) => {
  if (job && job.attemptsMade >= defaultJobOptions.attempts) {
    console.error(
      `🔴 Job ${job.id} failed permanently after ${job.attemptsMade} attempts`
    );

    // Move to Dead Letter Queue
    await dlqQueue.add("verification-failed", {
      originalJobId: job.id,
      data: job.data,
      error: error.message,
      attempts: job.attemptsMade,
      failedAt: new Date().toISOString(),
    });

    // TODO: Send alert to admin (email, Slack, etc.)
    console.log(`📨 Job ${job.id} moved to DLQ for admin review`);
  }
});

export default verificationWorker;
