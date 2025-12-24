import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// AXIOS INSTANCE FOR TRANSACTIONAL/MUTATION OPERATIONS
// ============================================================================
// Use this for: Auth, Purchase, Chat, Upload, and all POST/PUT/PATCH/DELETE
// DO NOT use for: Feed, Leaderboard, Profile (use native fetch for SEO/caching)
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Create singleton Axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Token getter - will be set by auth provider
let getAccessToken: (() => Promise<string | null>) | null = null;

export function setTokenGetter(getter: () => Promise<string | null>) {
  getAccessToken = getter;
}

// ============================================================================
// REQUEST INTERCEPTORS
// ============================================================================

// 1. Auth Interceptor - Auto-inject Authorization header
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (getAccessToken) {
      const token = await getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Idempotency Interceptor - Auto-generate x-idempotency-key for mutations
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const mutationMethods = ["post", "put", "patch"];
    if (
      config.method &&
      mutationMethods.includes(config.method.toLowerCase())
    ) {
      // Check if idempotency key already exists
      if (!config.headers["x-idempotency-key"]) {
        config.headers["x-idempotency-key"] = uuidv4();
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================================
// RESPONSE INTERCEPTORS
// ============================================================================

// Error handling callbacks - can be set by the app
let onUnauthorized: (() => void) | null = null;
let onServerError: ((message: string) => void) | null = null;

export function setErrorHandlers(handlers: {
  onUnauthorized?: () => void;
  onServerError?: (message: string) => void;
}) {
  if (handlers.onUnauthorized) onUnauthorized = handlers.onUnauthorized;
  if (handlers.onServerError) onServerError = handlers.onServerError;
}

// Centralized error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: string; code?: string }>) => {
    const status = error.response?.status;

    // 401 Unauthorized - Token expired or invalid
    if (status === 401) {
      if (onUnauthorized) {
        onUnauthorized();
      }
      // Could trigger token refresh here if needed
    }

    // 5xx Server Error - Show toast notification
    if (status && status >= 500) {
      const message =
        error.response?.data?.error || "Hệ thống đang bận. Vui lòng thử lại.";
      if (onServerError) {
        onServerError(message);
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Helper to extract error message from Axios error
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error || error.message || "Đã có lỗi xảy ra";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Đã có lỗi xảy ra";
}

/**
 * Helper to check if error is a specific error code
 */
export function isErrorCode(error: unknown, code: string): boolean {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.code === code;
  }
  return false;
}

// ============================================================================
// TYPE-SAFE API METHODS
// ============================================================================

// Auth
export const authApi = {
  loginWithGoogle: (code: string) =>
    api.post<{ access_token: string; refresh_token: string }>("/auth/google", {
      code,
    }),

  getMe: () => api.get("/auth/me"),

  logConsent: (consentType: string, version: string) =>
    api.post("/auth/consent", { consent_type: consentType, version }),
};

// Verification
export const verifyApi = {
  getStatus: () => api.get("/verify/status"),

  getUploadUrl: (contentType: string) =>
    api.post<{ upload_url: string; file_key: string; expires_in: number }>(
      "/verify/upload-url",
      { content_type: contentType }
    ),

  submit: (imageUrl: string) =>
    api.post("/verify/submit", { image_url: imageUrl }),
};

// Marketplace (requires idempotency)
export const marketplaceApi = {
  purchase: (materialId: string, idempotencyKey?: string) =>
    api.post(
      "/marketplace/purchase",
      { material_id: materialId },
      idempotencyKey ? { headers: { "x-idempotency-key": idempotencyKey } } : {}
    ),

  createMaterial: (data: {
    title: string;
    description?: string;
    price: number;
    type: "document" | "course";
    file_key?: string;
  }) => api.post("/marketplace/materials", data),
};

// Social (mutations only - reads use fetch)
export const socialApi = {
  createPost: (data: { content: string; type?: string; privacy?: string }) =>
    api.post("/social/posts", data),

  likePost: (postId: string) => api.post(`/social/posts/${postId}/like`),

  unlikePost: (postId: string) => api.delete(`/social/posts/${postId}/like`),

  createComment: (postId: string, content: string) =>
    api.post(`/social/posts/${postId}/comments`, { content }),
};

// Chat
export const chatApi = {
  sendMessage: (conversationId: string, content: string) =>
    api.post(`/chat/${conversationId}/messages`, { content }),

  startConversation: (userId: string) =>
    api.post("/chat/conversations", { user_id: userId }),
};

// Wallet
export const walletApi = {
  deposit: (amount: number, idempotencyKey?: string) =>
    api.post(
      "/wallet/deposit",
      { amount },
      idempotencyKey ? { headers: { "x-idempotency-key": idempotencyKey } } : {}
    ),

  getBalance: () => api.get("/wallet/balance"),
};

export default api;
