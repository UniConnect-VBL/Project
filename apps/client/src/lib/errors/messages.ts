/**
 * Error Messages - Vietnamese localization
 * Rule 8: Frontend maps ErrorCodes → tiếng Việt
 */

// Auth Error Messages
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  // Supabase Auth Errors
  "Invalid login credentials": "Email hoặc mật khẩu không đúng",
  "Email not confirmed": "Vui lòng xác nhận email trước khi đăng nhập",
  "User already registered": "Email này đã được đăng ký",
  "Password should be at least 6 characters":
    "Mật khẩu phải có ít nhất 6 ký tự",
  "Unable to validate email address: invalid format":
    "Định dạng email không hợp lệ",
  "Signups not allowed for this instance": "Đăng ký tài khoản tạm thời bị tắt",
  "Email rate limit exceeded": "Quá nhiều yêu cầu. Vui lòng thử lại sau",

  // API Error Codes
  AUTH_NO_TOKEN: "Vui lòng đăng nhập để tiếp tục",
  AUTH_INVALID_TOKEN: "Phiên đăng nhập không hợp lệ",
  AUTH_TOKEN_EXPIRED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại",
  AUTH_USER_NOT_FOUND: "Không tìm thấy tài khoản",
  AUTH_UNAUTHORIZED: "Bạn không có quyền truy cập",
  AUTH_FORBIDDEN: "Hành động này bị cấm",
  AUTH_GOOGLE_CODE_REQUIRED: "Thiếu mã xác thực Google",
  AUTH_GOOGLE_EXCHANGE_FAILED: "Đăng nhập Google thất bại",
  AUTH_SESSION_CREATION_FAILED: "Không thể tạo phiên đăng nhập",
  AUTH_EMAIL_NOT_AVAILABLE: "Email đã được sử dụng",

  // Validation Error Codes (from Zod)
  EMAIL_REQUIRED: "Vui lòng nhập email",
  EMAIL_INVALID_FORMAT: "Định dạng email không hợp lệ",
  EMAIL_TOO_LONG: "Email quá dài",
  PASSWORD_REQUIRED: "Vui lòng nhập mật khẩu",
  PASSWORD_TOO_SHORT: "Mật khẩu phải có ít nhất 8 ký tự",
  PASSWORD_TOO_LONG: "Mật khẩu quá dài",
  PASSWORD_MISSING_UPPERCASE: "Mật khẩu phải có ít nhất 1 chữ hoa",
  PASSWORD_MISSING_LOWERCASE: "Mật khẩu phải có ít nhất 1 chữ thường",
  PASSWORD_MISSING_NUMBER: "Mật khẩu phải có ít nhất 1 số",
  CONFIRM_PASSWORD_REQUIRED: "Vui lòng xác nhận mật khẩu",
  PASSWORDS_DO_NOT_MATCH: "Mật khẩu xác nhận không khớp",
  CONSENT_REQUIRED: "Bạn cần đồng ý với điều khoản để tiếp tục",

  // Generic
  INTERNAL_ERROR: "Đã có lỗi xảy ra. Vui lòng thử lại sau",
  NETWORK_ERROR: "Lỗi kết nối. Vui lòng kiểm tra mạng",
};

// Permission Error Messages
export const PERMISSION_ERROR_MESSAGES: Record<string, string> = {
  PERMISSION_DENIED: "Bạn không có quyền thực hiện hành động này",
  PERMISSION_INSUFFICIENT_TRUST: "Điểm uy tín của bạn chưa đủ",
  PERMISSION_TIER_TOO_LOW:
    "Bạn cần nâng cấp tài khoản để sử dụng tính năng này",
  PERMISSION_NOT_OWNER: "Bạn không phải chủ sở hữu",
  PERMISSION_NOT_ADMIN: "Bạn không phải admin",
  PERMISSION_VERIFICATION_REQUIRED: "Vui lòng xác minh tài khoản để tiếp tục",
};

// Wallet & Transaction Error Messages
export const WALLET_ERROR_MESSAGES: Record<string, string> = {
  WALLET_INSUFFICIENT: "Số dư ví không đủ",
  WALLET_NOT_FOUND: "Không tìm thấy ví",
  WALLET_LOCKED: "Ví đang bị khóa tạm thời",
  TRANSACTION_FAILED: "Giao dịch thất bại",
  TRANSACTION_INVALID: "Giao dịch không hợp lệ",
  ESCROW_DISPUTED: "Giao dịch đang bị tranh chấp",
};

// All error messages combined
export const ALL_ERROR_MESSAGES: Record<string, string> = {
  ...AUTH_ERROR_MESSAGES,
  ...PERMISSION_ERROR_MESSAGES,
  ...WALLET_ERROR_MESSAGES,
};

/**
 * Get localized error message
 * @param code - Error code or raw error message
 * @returns Vietnamese error message
 */
export function getErrorMessage(code: string): string {
  return ALL_ERROR_MESSAGES[code] || code || "Đã có lỗi xảy ra";
}

/**
 * Get error message from Error object
 */
export function getErrorMessageFromError(error: Error | unknown): string {
  if (error instanceof Error) {
    return getErrorMessage(error.message);
  }
  return getErrorMessage("INTERNAL_ERROR");
}
