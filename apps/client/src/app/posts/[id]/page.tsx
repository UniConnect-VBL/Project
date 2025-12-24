/**
 * Post Detail Page with Dynamic SEO Metadata
 *
 * Rule 6: Dynamic Metadata for SEO & Social Sharing (Open Graph)
 * - Uses generateMetadata to fetch post info and display:
 *   - Thumbnail image when shared on Facebook/Zalo
 *   - Post summary as description
 *   - Author name
 */

import { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: { id: string };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Fetch post data for metadata generation
 */
async function getPost(id: string) {
  try {
    const res = await fetch(`${API_URL}/posts/${id}`, {
      next: { revalidate: 60 }, // Cache for 60 seconds (ISR)
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.data || data;
  } catch {
    return null;
  }
}

/**
 * Generate dynamic metadata for SEO and social sharing
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost(params.id);

  if (!post) {
    return {
      title: "Bài viết không tồn tại | UniHood",
      description: "Bài viết bạn tìm không tồn tại hoặc đã bị xóa.",
    };
  }

  // Create description from content (max 160 chars)
  const description = post.content
    ? post.content.substring(0, 157) + (post.content.length > 157 ? "..." : "")
    : "Xem bài viết trên UniHood - Mạng xã hội sinh viên Việt Nam";

  // Get first image from media, or use default
  const image = post.media?.[0]?.url || `${API_URL}/og-default.png`;

  // Author name
  const authorName = post.user?.full_name || "Người dùng UniHood";

  const title = `${authorName} trên UniHood`;

  return {
    title,
    description,

    // Open Graph (Facebook, Zalo, etc.)
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "UniHood",
      locale: "vi_VN",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: description,
        },
      ],
      authors: [authorName],
      publishedTime: post.created_at,
    },

    // Twitter Card
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },

    // Additional metadata
    robots: {
      index: post.privacy === "public",
      follow: post.privacy === "public",
    },
  };
}

/**
 * Post Detail Page Component
 */
export default async function PostDetailPage({ params }: Props) {
  const post = await getPost(params.id);

  if (!post) {
    notFound();
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <article className="max-w-2xl mx-auto">
        {/* Post Header */}
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            {post.user?.avatar_url && (
              <img
                src={post.user.avatar_url}
                alt={post.user.full_name}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            <div>
              <h2 className="font-semibold">
                {post.user?.full_name || "Người dùng"}
              </h2>
              <time className="text-sm text-gray-500">
                {new Date(post.created_at).toLocaleDateString("vi-VN")}
              </time>
            </div>
          </div>
        </header>

        {/* Post Content */}
        <div className="prose prose-lg max-w-none mb-6">
          <p className="whitespace-pre-wrap">{post.content}</p>
        </div>

        {/* Post Media */}
        {post.media && post.media.length > 0 && (
          <div className="grid gap-2 mb-6">
            {post.media.map((m: { url: string; type: string }, idx: number) => (
              <div key={idx}>
                {m.type === "image" ? (
                  <img
                    src={m.url}
                    alt={`Media ${idx + 1}`}
                    className="w-full rounded-lg"
                  />
                ) : (
                  <video src={m.url} controls className="w-full rounded-lg" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Engagement Stats */}
        <footer className="flex gap-6 text-gray-600">
          <span>❤️ {post.likes_count || 0} lượt thích</span>
          <span>💬 {post.comments_count || 0} bình luận</span>
          <span>🔗 {post.shares_count || 0} chia sẻ</span>
        </footer>
      </article>
    </main>
  );
}
