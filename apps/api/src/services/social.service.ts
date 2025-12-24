import { getSupabaseService } from "../utils/supabase.js";
import { ensureRedis, redisClient } from "../utils/redis.js";
import { insertNotification } from "./notification.service.js";
import type { VisibilityType } from "@unihood/types";

interface FeedQueryParams {
  cursor?: string;
  id?: string;
  school_id?: string;
  limit?: number;
  viewer_id: string;
  viewer_school_id?: string;
}

/**
 * Get feed with visibility filtering and cursor pagination.
 * Applies complex visibility rules: public/school/friends/private
 */
export async function getFeed(params: FeedQueryParams) {
  const supabase = getSupabaseService();
  if (!supabase) {
    throw new Error("Supabase service client not configured");
  }

  const limit = params.limit || 20;
  let query = supabase
    .from("posts")
    .select(
      `
      id,
      user_id,
      content,
      media_urls,
      visibility,
      likes_count,
      comments_count,
      created_at,
      profiles!inner(id, school_id, full_name, avatar_url)
    `
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1); // Fetch one extra to determine if there's a next page

  // Apply visibility filtering
  // public: visible to all
  // school: visible only if viewer.school_id === author.school_id
  // friends: visible only if viewer follows author
  // private: visible only to author

  // Build visibility filter
  const visibilityConditions: string[] = ["visibility.eq.public"];

  if (params.viewer_school_id) {
    visibilityConditions.push(
      `and(visibility.eq.school,profiles.school_id.eq.${params.viewer_school_id})`
    );
  }

  // For friends visibility, we need to check relationships
  // This is complex - we'll filter in application layer for now
  // For private, check if viewer is the author

  // Apply cursor pagination
  if (params.cursor && params.id) {
    const cursorDate = new Date(params.cursor);
    query = query.or(
      `created_at.lt.${cursorDate.toISOString()},and(created_at.eq.${cursorDate.toISOString()},id.lt.${
        params.id
      })`
    );
  }

  // Filter by school_id if provided (for school-scoped feed)
  if (params.school_id) {
    query = query.eq("profiles.school_id", params.school_id);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch feed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return { posts: [], next_cursor: null };
  }

  // Filter by visibility rules in application layer
  const filteredPosts = [];
  for (const post of data) {
    const author = post.profiles;
    const visibility = post.visibility as VisibilityType;

    if (visibility === "public") {
      filteredPosts.push(post);
    } else if (visibility === "school_only") {
      const author = Array.isArray(post.profiles)
        ? post.profiles[0]
        : post.profiles;
      if (
        params.viewer_school_id &&
        author?.school_id === params.viewer_school_id
      ) {
        filteredPosts.push(post);
      }
    } else if (visibility === "friends") {
      const author = Array.isArray(post.profiles)
        ? post.profiles[0]
        : post.profiles;
      // Check if viewer follows author
      const { data: relationship } = await supabase
        .from("relationships")
        .select("status")
        .eq("follower_id", params.viewer_id)
        .eq("following_id", author?.id)
        .eq("status", "accepted")
        .single();

      if (relationship) {
        filteredPosts.push(post);
      }
    } else if (visibility === "private") {
      if (post.user_id === params.viewer_id) {
        filteredPosts.push(post);
      }
    }

    if (filteredPosts.length >= limit) break;
  }

  const hasNextPage = data.length > limit;
  const nextPost = hasNextPage ? data[limit] : null;
  const nextCursor = nextPost
    ? `${nextPost.created_at}&next_id=${nextPost.id}`
    : null;

  return {
    posts: filteredPosts.slice(0, limit),
    next_cursor: nextCursor,
  };
}

/**
 * Create a new post with moderation queue
 */
export async function createPost(
  userId: string,
  content: string,
  mediaUrls: string[] = [],
  visibility: VisibilityType = "school_only"
) {
  const supabase = getSupabaseService();
  if (!supabase) {
    throw new Error("Supabase service client not configured");
  }

  if (!content || content.trim().length === 0) {
    throw new Error("Post content cannot be empty");
  }

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      user_id: userId,
      content: content.trim(),
      media_urls: mediaUrls,
      visibility,
      likes_count: 0,
      comments_count: 0,
      deleted_at: null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create post: ${error.message}`);
  }

  // Push to moderation queue
  await ensureRedis();
  await redisClient.rPush(
    "moderation",
    JSON.stringify({
      type: "post",
      post_id: post.id,
      content: post.content,
    })
  );

  return post;
}

/**
 * Like a post
 */
export async function likePost(postId: string, userId: string) {
  const supabase = getSupabaseService();
  if (!supabase) {
    throw new Error("Supabase service client not configured");
  }

  // Check if already liked
  const { data: existing } = await supabase
    .from("likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    throw new Error("Post already liked");
  }

  // Insert like
  const { error: likeError } = await supabase.from("likes").insert({
    post_id: postId,
    user_id: userId,
  });

  if (likeError) {
    throw new Error(`Failed to like post: ${likeError.message}`);
  }

  // Update likes_count
  await supabase.rpc("increment", {
    table_name: "posts",
    column_name: "likes_count",
    row_id: postId,
    amount: 1,
  });

  // Get post author for notification
  const { data: post } = await supabase
    .from("posts")
    .select("user_id")
    .eq("id", postId)
    .single();

  if (post && post.user_id !== userId) {
    await insertNotification({
      user_id: post.user_id,
      actor_id: userId,
      type: "social_like",
      title: "Post liked",
      content: "Someone liked your post",
      metadata: { post_id: postId },
    });
  }

  return { post_id: postId, user_id: userId };
}

/**
 * Comment on a post
 */
export async function commentPost(
  postId: string,
  userId: string,
  content: string
) {
  const supabase = getSupabaseService();
  if (!supabase) {
    throw new Error("Supabase service client not configured");
  }

  if (!content || content.trim().length === 0) {
    throw new Error("Comment content cannot be empty");
  }

  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      user_id: userId,
      content: content.trim(),
      deleted_at: null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create comment: ${error.message}`);
  }

  // Update comments_count
  await supabase.rpc("increment", {
    table_name: "posts",
    column_name: "comments_count",
    row_id: postId,
    amount: 1,
  });

  // Get post author for notification
  const { data: post } = await supabase
    .from("posts")
    .select("user_id")
    .eq("id", postId)
    .single();

  if (post && post.user_id !== userId) {
    await insertNotification({
      user_id: post.user_id,
      actor_id: userId,
      type: "social_comment",
      title: "New comment",
      content: "Someone commented on your post",
      metadata: { post_id: postId, comment_id: comment.id },
    });
  }

  return comment;
}

/**
 * Soft delete a post/product/review/message
 */
export async function softDeleteItem(
  type: "post" | "product" | "review" | "message",
  itemId: string,
  userId: string,
  isAdmin: boolean = false
) {
  const supabase = getSupabaseService();
  if (!supabase) {
    throw new Error("Supabase service client not configured");
  }

  const tableMap: Record<string, string> = {
    post: "posts",
    product: "products",
    review: "reviews",
    message: "messages",
  };

  const table = tableMap[type];
  if (!table) {
    throw new Error(`Invalid type: ${type}`);
  }

  // Check ownership unless admin
  if (!isAdmin) {
    const { data: item } = await supabase
      .from(table)
      .select("user_id")
      .eq("id", itemId)
      .is("deleted_at", null)
      .single();

    if (!item) {
      throw new Error(`${type} not found`);
    }

    // For messages, check sender_id
    const ownerField = type === "message" ? "sender_id" : "user_id";
    const itemRecord = item as Record<string, unknown>;
    if (itemRecord[ownerField] !== userId) {
      throw new Error(`Not authorized to delete this ${type}`);
    }
  }

  const { error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", itemId);

  if (error) {
    throw new Error(`Failed to delete ${type}: ${error.message}`);
  }

  return { success: true };
}
