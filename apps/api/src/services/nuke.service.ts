/**
 * Nuke Service - PDPD Compliance (Rule 94)
 *
 * Provides "Nuke" feature for users to request hard deletion of all their data.
 * This permanently removes:
 * - User profile
 * - All posts, comments, likes
 * - All materials and transactions
 * - Verification proofs and images from R2
 * - Consent logs, notifications, messages
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { env } from "../env.js";

// Configure R2 client
const r2Client = env.R2_ENDPOINT
  ? new S3Client({
      region: "auto",
      endpoint: env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: env.R2_SECRET_ACCESS_KEY || "",
      },
    })
  : null;

const R2_BUCKET = env.R2_BUCKET_NAME || "unihood";

export interface NukeResult {
  success: boolean;
  deletedCounts: {
    posts: number;
    comments: number;
    likes: number;
    materials: number;
    transactions: number;
    verificationProofs: number;
    notifications: number;
    messages: number;
    consentLogs: number;
    r2Files: number;
  };
  errors: string[];
}

/**
 * Permanently delete all user data from the system
 * DANGER: This is irreversible!
 */
export async function nukeUserData(
  supabase: SupabaseClient,
  userId: string
): Promise<NukeResult> {
  const result: NukeResult = {
    success: false,
    deletedCounts: {
      posts: 0,
      comments: 0,
      likes: 0,
      materials: 0,
      transactions: 0,
      verificationProofs: 0,
      notifications: 0,
      messages: 0,
      consentLogs: 0,
      r2Files: 0,
    },
    errors: [],
  };

  try {
    // 1. Get all R2 file URLs to delete
    const r2FilesToDelete: string[] = [];

    // Get verification proof URLs
    const { data: proofs } = await supabase
      .from("verification_proofs")
      .select("image_url")
      .eq("user_id", userId);

    if (proofs) {
      proofs.forEach((p) => {
        if (p.image_url) r2FilesToDelete.push(p.image_url);
      });
    }

    // Get material file URLs
    const { data: materials } = await supabase
      .from("materials")
      .select("file_key, thumbnail_url")
      .eq("user_id", userId);

    if (materials) {
      materials.forEach((m) => {
        if (m.file_key) r2FilesToDelete.push(m.file_key);
        if (m.thumbnail_url) r2FilesToDelete.push(m.thumbnail_url);
      });
    }

    // Get post media URLs
    const { data: posts } = await supabase
      .from("posts")
      .select("id")
      .eq("user_id", userId);

    if (posts) {
      const postIds = posts.map((p) => p.id);
      const { data: media } = await supabase
        .from("post_media")
        .select("url")
        .in("post_id", postIds);

      if (media) {
        media.forEach((m) => {
          if (m.url) r2FilesToDelete.push(m.url);
        });
      }
    }

    // 2. Delete R2 files
    if (r2Client && r2FilesToDelete.length > 0) {
      try {
        const keysToDelete: { Key: string }[] = [];

        for (const url of r2FilesToDelete) {
          try {
            const urlObj = new URL(url);
            const key = urlObj.pathname.startsWith("/")
              ? urlObj.pathname.substring(1)
              : urlObj.pathname;
            keysToDelete.push({ Key: key });
          } catch {
            // URL parsing failed, skip
          }
        }

        if (keysToDelete.length > 0) {
          const deleteCommand = new DeleteObjectsCommand({
            Bucket: R2_BUCKET,
            Delete: {
              Objects: keysToDelete,
              Quiet: true,
            },
          });

          await r2Client.send(deleteCommand);
          result.deletedCounts.r2Files = keysToDelete.length;
        }
      } catch (r2Error) {
        const msg =
          r2Error instanceof Error ? r2Error.message : String(r2Error);
        result.errors.push(`R2 deletion error: ${msg}`);
      }
    }

    // 3. Delete database records (order matters for FK constraints)

    // Delete post_media first (FK to posts)
    if (posts && posts.length > 0) {
      const postIds = posts.map((p) => p.id);
      await supabase.from("post_media").delete().in("post_id", postIds);
    }

    // Delete comments
    const { count: commentsCount } = await supabase
      .from("comments")
      .delete({ count: "exact" })
      .eq("user_id", userId);
    result.deletedCounts.comments = commentsCount || 0;

    // Delete likes
    const { count: likesCount } = await supabase
      .from("likes")
      .delete({ count: "exact" })
      .eq("user_id", userId);
    result.deletedCounts.likes = likesCount || 0;

    // Delete posts
    const { count: postsCount } = await supabase
      .from("posts")
      .delete({ count: "exact" })
      .eq("user_id", userId);
    result.deletedCounts.posts = postsCount || 0;

    // Delete materials
    const { count: materialsCount } = await supabase
      .from("materials")
      .delete({ count: "exact" })
      .eq("user_id", userId);
    result.deletedCounts.materials = materialsCount || 0;

    // Delete transactions (both as buyer and seller)
    const { count: txCount } = await supabase
      .from("transactions")
      .delete({ count: "exact" })
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
    result.deletedCounts.transactions = txCount || 0;

    // Delete verification proofs
    const { count: proofsCount } = await supabase
      .from("verification_proofs")
      .delete({ count: "exact" })
      .eq("user_id", userId);
    result.deletedCounts.verificationProofs = proofsCount || 0;

    // Delete notifications
    const { count: notifCount } = await supabase
      .from("notifications")
      .delete({ count: "exact" })
      .eq("user_id", userId);
    result.deletedCounts.notifications = notifCount || 0;

    // Delete messages
    const { count: msgCount } = await supabase
      .from("messages")
      .delete({ count: "exact" })
      .eq("sender_id", userId);
    result.deletedCounts.messages = msgCount || 0;

    // Delete consent logs
    const { count: consentCount } = await supabase
      .from("consent_logs")
      .delete({ count: "exact" })
      .eq("user_id", userId);
    result.deletedCounts.consentLogs = consentCount || 0;

    // Delete wallet logs
    await supabase.from("wallet_logs").delete().eq("user_id", userId);

    // Delete relationships (followers/following)
    await supabase
      .from("relationships")
      .delete()
      .or(`follower_id.eq.${userId},following_id.eq.${userId}`);

    // Delete reports
    await supabase.from("reports").delete().eq("reporter_id", userId);

    // Delete disputes
    await supabase.from("disputes").delete().eq("reporter_id", userId);

    // Delete job applications
    await supabase.from("applications").delete().eq("applicant_id", userId);

    // Delete tickets
    await supabase.from("tickets").delete().eq("buyer_id", userId);

    // Finally, delete the user profile
    const { error: userDeleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", userId);

    if (userDeleteError) {
      result.errors.push(`User deletion failed: ${userDeleteError.message}`);
    } else {
      result.success = true;
    }

    // Log the nuke action in audit logs
    await supabase.from("audit_logs").insert({
      admin_id: userId,
      action: "NUKE_USER_DATA",
      target_id: userId,
      target_type: "user",
      metadata: {
        deleted_counts: result.deletedCounts,
        errors: result.errors,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    result.errors.push(`Unexpected error: ${msg}`);
  }

  return result;
}

/**
 * Request user data deletion (creates a pending nuke request)
 * For cases where admin approval is required
 */
export async function requestNuke(
  supabase: SupabaseClient,
  userId: string,
  reason?: string
): Promise<{ requestId: string }> {
  const { data, error } = await supabase
    .from("nuke_requests")
    .insert({
      user_id: userId,
      reason: reason || "User requested data deletion",
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create nuke request: ${error.message}`);
  }

  return { requestId: data.id };
}
