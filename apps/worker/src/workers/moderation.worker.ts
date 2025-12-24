/**
 * Moderation Worker - Toxic Content Check with Gemini
 *
 * Rule 5: All posts/reviews must be queued for Gemini toxic check before being approved
 */

import { Worker, Job } from "bullmq";
import { redisConnection, dlqQueue, defaultJobOptions } from "../queue.js";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../env.js";

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

interface ModerationJobData {
  contentId: string;
  contentType: "post" | "material" | "comment";
  content: string;
}

interface ModerationResult {
  isToxic: boolean;
  categories: string[];
  confidence: number;
  reason?: string;
}

/**
 * Check content for toxicity using Gemini
 */
async function checkToxicity(content: string): Promise<ModerationResult> {
  const prompt = `
    Analyze this content for toxicity and inappropriate content.
    Check for: hate speech, harassment, violence, sexual content, spam.
    
    Content to analyze:
    "${content}"
    
    Return ONLY a JSON object in this format:
    {
      "isToxic": true/false,
      "categories": ["hate", "harassment", etc] or [],
      "confidence": 0.0 to 1.0,
      "reason": "brief explanation if toxic"
    }
  `;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse moderation result");
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Moderation Worker
 */
const moderationWorker = new Worker<ModerationJobData>(
  "moderation",
  async (job: Job<ModerationJobData>) => {
    const { contentId, contentType, content } = job.data;
    console.log(`🔍 Moderating ${contentType} ${contentId}`);

    const result = await checkToxicity(content);
    const newStatus = result.isToxic ? "rejected" : "approved";

    // Update content status based on type
    const table =
      contentType === "post"
        ? "posts"
        : contentType === "material"
        ? "materials"
        : "comments";

    await supabase
      .from(table)
      .update({ ai_status: newStatus })
      .eq("id", contentId);

    console.log(`✅ ${contentType} ${contentId} moderated: ${newStatus}`);
    return { success: true, result };
  },
  {
    connection: redisConnection,
    concurrency: 5,
    limiter: { max: 10, duration: 60000 },
  }
);

// Handle permanent failures
moderationWorker.on("failed", async (job, error) => {
  if (job && job.attemptsMade >= defaultJobOptions.attempts) {
    await dlqQueue.add("moderation-failed", {
      originalJobId: job.id,
      data: job.data,
      error: error.message,
      failedAt: new Date().toISOString(),
    });
  }
});

export default moderationWorker;
