// UniHood Type Definitions - Full Implementation

export type VerificationStatus =
  | "unverified"
  | "pending"
  | "approved"
  | "rejected";
export type VisibilityType = "public" | "school_only" | "friends" | "private";
export type UserRole = "student" | "teacher" | "recruiter" | "admin";
export type PostType = "post" | "story" | "short";
export type MaterialType = "document" | "course";
export type StreamStatus = "live" | "ended";
export type TransactionType = "purchase" | "donation" | "ticket_buy";
export type TransactionStatus =
  | "pending"
  | "escrow_hold"
  | "completed"
  | "failed"
  | "refunded";
export type DisputeStatus =
  | "pending"
  | "investigating"
  | "resolved_refund"
  | "resolved_reject";
export type AIStatus = "pending" | "approved" | "rejected";
export type ApplicationStatus = "applied" | "viewed" | "rejected" | "hired";
export type TicketStatus = "valid" | "used" | "refunded";

// Export error codes and types
export {
  ErrorCodes,
  type ApiErrorResponse,
  type ApiSuccessResponse,
  type ApiResponse,
  createErrorResponse,
  createSuccessResponse,
} from "./errors";

// School
export interface School {
  id: string;
  name: string;
  short_name?: string;
  logo_url?: string;
  total_trust_score: number;
  created_at: string;
}

// User/Profile
export interface User {
  id: string;
  email: string;
  google_id?: string;
  password_hash?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  role: UserRole;
  university?: string;
  major?: string;
  school_id?: string;
  student_code?: string;
  is_verified: boolean;
  verification_status: VerificationStatus;
  trust_score: number;
  wallet_balance: number;
  is_premium: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

// Consent Log
export interface ConsentLog {
  id: string;
  user_id: string;
  consent_type: string;
  version: string;
  consented_at: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
}

// Audit Log
export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_id?: string;
  target_type?: string;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

// Verification Proof (PDPD compliant)
export interface VerificationProof {
  id: string;
  user_id: string;
  image_url: string;
  extracted_data?: {
    mssv?: string | null;
    full_name?: string | null;
    school?: string | null;
  };
  status: 'pending' | 'approved' | 'rejected';
  rejected_reason?: string;
  deleted_at?: string;
  created_at: string;
}

// Verification API Types
export interface SubmitVerificationRequest {
  image_url: string;
}

export interface VerificationStatusResponse {
  status: VerificationStatus;
  student_code?: string;
  school?: School;
  submitted_at?: string;
  rejected_reason?: string;
}

export interface UploadUrlResponse {
  upload_url: string;
  file_key: string;
  expires_in: number;
}

// Post
export interface Post {
  id: string;
  user_id: string;
  content: string;
  type: PostType;
  school_filter?: string;
  privacy: VisibilityType;
  ai_status: AIStatus;
  embedding?: number[];
  likes_count: number;
  comments_count: number;
  shares_count: number;
  deleted_at?: string;
  created_at: string;
}

// Post Media
export interface PostMedia {
  id: string;
  post_id: string;
  url: string;
  type: "image" | "video";
  order: number;
  created_at: string;
}

// Comment
export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  deleted_at?: string;
  created_at: string;
}

// Like
export interface Like {
  user_id: string;
  post_id: string;
  created_at: string;
}

// Material
export interface Material {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  price: number;
  type: MaterialType;
  file_key?: string;
  thumbnail_url?: string;
  embedding?: number[];
  ai_status: AIStatus;
  sales_count: number;
  school_filter?: string;
  created_at: string;
}

// Stream
export interface Stream {
  id: string;
  user_id: string;
  title: string;
  stream_key: string;
  status: StreamStatus;
  thumbnail_url?: string;
  record_url?: string;
  total_donations: number;
  peak_viewers: number;
  created_at: string;
  ended_at?: string;
}

// Transaction
export interface Transaction {
  id: string;
  buyer_id: string;
  seller_id: string;
  material_id?: string;
  stream_id?: string;
  ticket_id?: string;
  amount: number;
  platform_fee: number;
  net_amount: number;
  type: TransactionType;
  status: TransactionStatus;
  escrow_release_at?: string;
  created_at: string;
}

// Dispute
export interface Dispute {
  id: string;
  transaction_id: string;
  reporter_id: string;
  reason: string;
  evidence_url?: string;
  status: DisputeStatus;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

// Job
export interface Job {
  id: string;
  recruiter_id: string;
  title: string;
  company_name: string;
  location?: string;
  salary_range?: string;
  description?: string;
  requirements?: string;
  type?: string;
  application_count: number;
  embedding?: number[];
  is_active: boolean;
  created_at: string;
}

// Application
export interface Application {
  id: string;
  job_id: string;
  applicant_id: string;
  cv_url?: string;
  note?: string;
  status: ApplicationStatus;
  created_at: string;
}

// Event
export interface Event {
  id: string;
  organizer_id: string;
  title: string;
  description?: string;
  banner_url?: string;
  start_time: string;
  location?: string;
  ticket_price: number;
  max_capacity?: number;
  sold_count: number;
  created_at: string;
}

// Ticket
export interface Ticket {
  id: string;
  event_id: string;
  buyer_id: string;
  qr_code: string;
  status: TicketStatus;
  created_at: string;
}

// Relationship
export interface Relationship {
  follower_id: string;
  following_id: string;
  status: string;
  created_at: string;
}

// Notification
export interface Notification {
  id: string;
  user_id: string;
  actor_id?: string;
  type: string;
  title?: string;
  content?: string;
  metadata?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

// Report
export interface Report {
  id: string;
  reporter_id: string;
  target_id: string;
  target_type: "post" | "material" | "review" | "user";
  reason: string;
  status: string;
  created_at: string;
}

// Conversation
export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
}

// Message
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  deleted_at?: string;
  created_at: string;
}

// API Request/Response Types
export interface CreatePostRequest {
  content: string;
  type?: PostType;
  school_filter?: string;
  privacy?: VisibilityType;
  media?: Array<{ url: string; type: "image" | "video"; order?: number }>;
}

export interface CreateMaterialRequest {
  title: string;
  description?: string;
  price: number;
  type: MaterialType;
  file_key?: string;
  thumbnail_url?: string;
  school_filter?: string;
}

export interface PurchaseRequest {
  material_id: string;
}

export interface CreateDisputeRequest {
  transaction_id: string;
  reason: string;
  evidence_url?: string;
}

export interface CreateStreamRequest {
  title: string;
  thumbnail_url?: string;
}

export interface DonateRequest {
  stream_id: string;
  amount: number;
}

export interface CreateJobRequest {
  title: string;
  company_name: string;
  location?: string;
  salary_range?: string;
  description?: string;
  requirements?: string;
  type?: string;
}

export interface ApplyJobRequest {
  job_id: string;
  cv_url?: string;
  note?: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  banner_url?: string;
  start_time: string;
  location?: string;
  ticket_price: number;
  max_capacity?: number;
}

export interface BuyTicketRequest {
  event_id: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  role?: UserRole;
  university?: string;
  major?: string;
  consent_agreed: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  full_name?: string;
  major?: string;
  avatar_url?: string;
  bio?: string;
}

export interface ResolveDisputeRequest {
  status: "resolved_refund" | "resolved_reject";
}

export interface ApproveContentRequest {
  status: "approved" | "rejected";
  type: "post" | "material";
}
