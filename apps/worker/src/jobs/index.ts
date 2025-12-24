import type { SupabaseClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { withGeminiRetry } from "../utils/retry.js";
import { pushToDLQ } from "../utils/dlq.js";

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// Constants for retry logic
const MAX_RETRIES = 5;

interface ExtractedData {
  mssv: string | null;
  full_name: string | null;
  school: string | null;
}

/**
 * Download image from URL and convert to base64
 */
async function downloadImageAsBase64(
  url: string
): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const contentType = response.headers.get("content-type") || "image/jpeg";

  return {
    data: base64,
    mimeType: contentType,
  };
}

// OCR Verification Job
export async function handleVerificationJob(
  payload: { user_id: string; proof_id?: string; proof_url: string },
  supabase: SupabaseClient | null
) {
  console.log("Processing verification job", payload);
  if (!supabase || !genAI) {
    console.error("Supabase or Gemini not configured");
    return;
  }

  const { user_id, proof_id, proof_url } = payload;

  try {
    // Download image and convert to base64
    console.log("Downloading image from:", proof_url);
    const imageData = await downloadImageAsBase64(proof_url);

    // Call Gemini OCR with improved prompt
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Extract MSSV, Full Name, University from this Vietnamese student ID card.
Return ONLY valid JSON format: { "mssv": string | null, "full_name": string | null, "school": string | null }
If any field is unclear or not visible, return null for that field.
Do not include any explanation, only JSON.`;

    const imagePart = {
      inlineData: {
        data: imageData.data,
        mimeType: imageData.mimeType,
      },
    };

    // Rule 60: Use exponential backoff for Gemini API calls
    const result = await withGeminiRetry(() =>
      model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }, imagePart] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      })
    );

    const response = await result.response;
    const text = response.text().trim();
    console.log("Gemini response:", text);

    // Parse JSON response
    let extracted: ExtractedData;
    try {
      extracted = JSON.parse(text);
    } catch {
      // Fallback parsing if JSON is malformed
      const mssvMatch = text.match(/mssv["\s:]+([A-Z0-9]+)/i);
      const schoolMatch = text.match(/school["\s:]+([^",}]+)/i);
      const nameMatch = text.match(/full_name["\s:]+([^",}]+)/i);
      extracted = {
        mssv: mssvMatch?.[1]?.trim() || null,
        school: schoolMatch?.[1]?.trim() || null,
        full_name: nameMatch?.[1]?.trim() || null,
      };
    }

    // Check if required fields were extracted
    if (!extracted.mssv || !extracted.school) {
      throw new Error(
        "Không tìm thấy thông tin trên thẻ. Vui lòng upload ảnh rõ hơn."
      );
    }

    // Update verification_proofs with extracted data
    if (proof_id) {
      await supabase
        .from("verification_proofs")
        .update({
          extracted_data: extracted,
          status: "approved",
        })
        .eq("id", proof_id);
    }

    // Find school by name
    const { data: school } = await supabase
      .from("schools")
      .select("id, name")
      .ilike("name", `%${extracted.school}%`)
      .limit(1)
      .single();

    if (!school) {
      throw new Error(
        `Không tìm thấy trường "${extracted.school}" trong hệ thống.`
      );
    }

    // Check if MSSV already exists
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("student_code", extracted.mssv)
      .is("deleted_at", null)
      .single();

    if (existing && existing.id !== user_id) {
      throw new Error(
        `MSSV ${extracted.mssv} đã được đăng ký bởi tài khoản khác.`
      );
    }

    // Update user with verification info
    const { error: updateError } = await supabase
      .from("users")
      .update({
        student_code: extracted.mssv,
        full_name: extracted.full_name || undefined,
        school_id: school.id,
        is_verified: true,
        verification_status: "approved",
        trust_score: 50, // Boost trust score on verification
      })
      .eq("id", user_id);

    if (updateError) throw updateError;

    // Create success notification
    await supabase.from("notifications").insert({
      user_id,
      type: "verification_approved",
      title: "Xác thực thành công",
      content: `Chào mừng ${extracted.full_name || "bạn"} đến từ ${
        school.name
      }! Tài khoản đã được xác thực.`,
      metadata: { school_id: school.id, student_code: extracted.mssv },
    });

    console.log(
      "Verification approved for user",
      user_id,
      "MSSV:",
      extracted.mssv
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Lỗi xử lý xác thực";
    console.error("Verification job error:", errorMessage);

    // Update proof status to rejected with reason
    if (proof_id) {
      await supabase
        .from("verification_proofs")
        .update({
          status: "rejected",
          rejected_reason: errorMessage,
        })
        .eq("id", proof_id);
    }

    // Update user status to rejected
    await supabase
      .from("users")
      .update({
        verification_status: "rejected",
      })
      .eq("id", user_id);

    // Create rejection notification
    await supabase.from("notifications").insert({
      user_id,
      type: "verification_rejected",
      title: "Xác thực không thành công",
      content: errorMessage,
    });
  }
}

// Moderation Job
export async function handleModerationJob(
  payload: any,
  supabase: SupabaseClient | null
) {
  console.log("Processing moderation job", payload);
  if (!supabase || !genAI) {
    console.error("Supabase or Gemini not configured");
    return;
  }

  try {
    const { type, post_id, material_id, content } = payload;

    // Call Gemini for toxic score
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Rate the toxicity of this Vietnamese text from 0.0 to 1.0 (0 = safe, 1 = very toxic). Return only a number: ${content}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    const toxicScore = parseFloat(text) || 0.5;

    const aiStatus = toxicScore > 0.5 ? "rejected" : "approved";

    // Update based on type
    if (type === "post" && post_id) {
      await supabase
        .from("posts")
        .update({ ai_status: aiStatus })
        .eq("id", post_id);

      // Create notification
      const { data: post } = await supabase
        .from("posts")
        .select("user_id")
        .eq("id", post_id)
        .single();

      if (post) {
        await supabase.from("notifications").insert({
          user_id: post.user_id,
          type: `post_${aiStatus}`,
          title: `Post ${aiStatus}`,
          content: `Your post has been ${aiStatus} by AI moderation.`,
        });
      }
    } else if (type === "material" && material_id) {
      await supabase
        .from("materials")
        .update({ ai_status: aiStatus })
        .eq("id", material_id);

      // Create notification
      const { data: material } = await supabase
        .from("materials")
        .select("user_id")
        .eq("id", material_id)
        .single();

      if (material) {
        await supabase.from("notifications").insert({
          user_id: material.user_id,
          type: `material_${aiStatus}`,
          title: `Material ${aiStatus}`,
          content: `Your material has been ${aiStatus} by AI moderation.`,
        });
      }
    }

    console.log(
      `Moderation completed: ${type} ${post_id || material_id} - ${aiStatus}`
    );
  } catch (error: unknown) {
    console.error("Moderation job error:", error);
  }
}

// Recommendation Embedding Job
export async function handleRecommendationJob(
  payload: any,
  supabase: SupabaseClient | null
) {
  console.log("Processing recommendation job", payload);
  if (!supabase) {
    console.error("Supabase not configured");
    return;
  }

  try {
    const { type, post_id, material_id, job_id, content } = payload;

    // TODO: Use local embedding model (Xenova.js) or call Gemini Embedding API
    // For now, generate a mock embedding vector(768) - Gemini 1.5 Flash standard
    const embedding = Array.from({ length: 768 }, () => Math.random());

    // Update based on type
    if (type === "post_embedding" && post_id) {
      await supabase
        .from("posts")
        .update({ embedding: `[${embedding.join(",")}]` })
        .eq("id", post_id);
    } else if (type === "material_embedding" && material_id) {
      await supabase
        .from("materials")
        .update({ embedding: `[${embedding.join(",")}]` })
        .eq("id", material_id);
    } else if (type === "job_embedding" && job_id) {
      await supabase
        .from("jobs")
        .update({ embedding: `[${embedding.join(",")}]` })
        .eq("id", job_id);
    }

    console.log(`Embedding generated for ${type}`);
  } catch (error: unknown) {
    console.error("Recommendation job error:", error);
  }
}

// Escrow Release Job
export async function handleEscrowReleaseJob(
  payload: any,
  supabase: SupabaseClient | null
) {
  console.log("Processing escrow release job", payload);
  if (!supabase) {
    console.error("Supabase not configured");
    return;
  }

  try {
    const { transaction_id } = payload;

    // Call RPC to release escrow
    const { data, error } = await supabase.rpc("release_escrow", {
      p_transaction_id: transaction_id,
    });

    if (error) throw error;
    if (!data.success) {
      throw new Error(data.error || "Failed to release escrow");
    }

    // Get transaction details for notifications
    const { data: transaction } = await supabase
      .from("transactions")
      .select("buyer_id, seller_id, material_id")
      .eq("id", transaction_id)
      .single();

    if (transaction) {
      // Notify seller
      await supabase.from("notifications").insert({
        user_id: transaction.seller_id,
        type: "escrow_released",
        title: "Escrow released",
        content: "Your escrow has been released and funds are now available.",
      });

      // Notify buyer
      await supabase.from("notifications").insert({
        user_id: transaction.buyer_id,
        type: "escrow_released",
        title: "Escrow period ended",
        content: "The escrow period has ended. Transaction completed.",
      });
    }

    console.log("Escrow released for transaction", transaction_id);
  } catch (error: unknown) {
    console.error("Escrow release job error:", error);
  }
}
