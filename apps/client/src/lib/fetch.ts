// ============================================================================
// FETCH HELPERS FOR READ OPERATIONS (SEO/Speed)
// ============================================================================
// Use these for: Feed, Leaderboard, Profile - leverages Next.js caching & ISR
// DO NOT use for: Mutations (Auth, Purchase, Chat) - use Axios instance instead
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface FetchOptions {
  token?: string;
  revalidate?: number | false; // Next.js ISR revalidation
  tags?: string[]; // Next.js cache tags
  cache?: RequestCache;
}

/**
 * Server-side fetch with Next.js caching support
 * Use for SEO-important pages: Feed, Profile, Leaderboard
 */
export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, revalidate = 60, tags, cache } = options;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const fetchOptions: RequestInit = {
    headers,
    next: {
      revalidate: revalidate === false ? undefined : revalidate,
      tags,
    },
    cache: cache || (revalidate === false ? "no-store" : undefined),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// PRE-CONFIGURED FETCH FUNCTIONS FOR COMMON READ OPERATIONS
// ============================================================================

// Feed - Public, ISR cached
export async function fetchFeed(params: {
  cursor?: string;
  limit?: number;
  schoolId?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params.cursor) searchParams.set("cursor", params.cursor);
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.schoolId) searchParams.set("school_id", params.schoolId);

  return apiFetch<{
    posts: Array<{
      id: string;
      content: string;
      user: { id: string; full_name: string; avatar_url?: string };
      likes_count: number;
      comments_count: number;
      created_at: string;
    }>;
    next_cursor?: string;
  }>(`/social/feed?${searchParams.toString()}`, {
    revalidate: 30, // Revalidate every 30 seconds
    tags: ["feed"],
  });
}

// Profile - Public, ISR cached
export async function fetchProfile(userId: string) {
  return apiFetch<{
    id: string;
    full_name?: string;
    avatar_url?: string;
    bio?: string;
    is_verified: boolean;
    verification_status: string;
    trust_score: number;
    school?: { id: string; name: string; short_name?: string };
    posts_count: number;
    followers_count: number;
    following_count: number;
  }>(`/users/${userId}/profile`, {
    revalidate: 60, // Revalidate every minute
    tags: ["profile", `profile-${userId}`],
  });
}

// Leaderboard - Public, cached with Redis
export async function fetchLeaderboard(params: {
  type?: "trust_score" | "sales" | "donations";
  schoolId?: string;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params.type) searchParams.set("type", params.type);
  if (params.schoolId) searchParams.set("school_id", params.schoolId);
  if (params.limit) searchParams.set("limit", params.limit.toString());

  return apiFetch<{
    rankings: Array<{
      rank: number;
      user: { id: string; full_name: string; avatar_url?: string };
      score: number;
      school?: { id: string; short_name: string };
    }>;
  }>(`/leaderboard?${searchParams.toString()}`, {
    revalidate: 300, // Revalidate every 5 minutes
    tags: ["leaderboard"],
  });
}

// Materials/Marketplace - Public listings
export async function fetchMaterials(params: {
  cursor?: string;
  limit?: number;
  type?: "document" | "course";
  schoolId?: string;
  minPrice?: number;
  maxPrice?: number;
}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) searchParams.set(key, String(value));
  });

  return apiFetch<{
    materials: Array<{
      id: string;
      title: string;
      description?: string;
      price: number;
      type: string;
      thumbnail_url?: string;
      sales_count: number;
      user: { id: string; full_name: string };
    }>;
    next_cursor?: string;
  }>(`/marketplace/materials?${searchParams.toString()}`, {
    revalidate: 60,
    tags: ["materials"],
  });
}

// Material detail
export async function fetchMaterialDetail(materialId: string) {
  return apiFetch<{
    id: string;
    title: string;
    description?: string;
    price: number;
    type: string;
    thumbnail_url?: string;
    sales_count: number;
    user: {
      id: string;
      full_name: string;
      avatar_url?: string;
      is_verified: boolean;
    };
    reviews: Array<{
      id: string;
      rating: number;
      content?: string;
      user: { id: string; full_name: string };
    }>;
  }>(`/marketplace/materials/${materialId}`, {
    revalidate: 30,
    tags: ["material", `material-${materialId}`],
  });
}

// Schools list
export async function fetchSchools() {
  return apiFetch<{
    schools: Array<{
      id: string;
      name: string;
      short_name: string;
      logo_url?: string;
      total_trust_score: number;
    }>;
  }>("/schools", {
    revalidate: 3600, // Revalidate every hour
    tags: ["schools"],
  });
}

// Events
export async function fetchEvents(params: {
  cursor?: string;
  limit?: number;
  schoolId?: string;
  upcoming?: boolean;
}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) searchParams.set(key, String(value));
  });

  return apiFetch<{
    events: Array<{
      id: string;
      title: string;
      description?: string;
      banner_url?: string;
      start_time: string;
      location?: string;
      ticket_price: number;
      sold_count: number;
      max_capacity?: number;
      organizer: { id: string; full_name: string };
    }>;
    next_cursor?: string;
  }>(`/events?${searchParams.toString()}`, {
    revalidate: 60,
    tags: ["events"],
  });
}

// Jobs
export async function fetchJobs(params: {
  cursor?: string;
  limit?: number;
  type?: string;
  location?: string;
}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) searchParams.set(key, String(value));
  });

  return apiFetch<{
    jobs: Array<{
      id: string;
      title: string;
      company_name: string;
      location?: string;
      salary_range?: string;
      type?: string;
      application_count: number;
      recruiter: { id: string; full_name: string };
    }>;
    next_cursor?: string;
  }>(`/jobs?${searchParams.toString()}`, {
    revalidate: 300,
    tags: ["jobs"],
  });
}
