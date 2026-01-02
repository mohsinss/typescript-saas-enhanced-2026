/**
 * Standardized API types for consistent responses
 */

// Base API response structure
export type ApiResponse<T = unknown> = 
  | ApiSuccessResponse<T>
  | ApiErrorResponse;

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  requestId: string;
  path?: string;
}

export interface ResponseMeta {
  pagination?: PaginationMeta;
  version: string;
  timestamp?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Common error codes
export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  
  // Validation
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",
  MISSING_FIELD = "MISSING_FIELD",
  
  // Resource errors
  NOT_FOUND = "NOT_FOUND",
  ALREADY_EXISTS = "ALREADY_EXISTS",
  CONFLICT = "CONFLICT",
  
  // Rate limiting
  RATE_LIMITED = "RATE_LIMITED",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  
  // Payment
  PAYMENT_REQUIRED = "PAYMENT_REQUIRED",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  SUBSCRIPTION_EXPIRED = "SUBSCRIPTION_EXPIRED",
  
  // Server errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
  
  // Business logic
  BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
}

// HTTP Status codes mapping
export const ErrorStatusMap: Record<ErrorCode, number> = {
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.INVALID_CREDENTIALS]: 401,
  
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_FIELD]: 400,
  
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.ALREADY_EXISTS]: 409,
  [ErrorCode.CONFLICT]: 409,
  
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.QUOTA_EXCEEDED]: 429,
  
  [ErrorCode.PAYMENT_REQUIRED]: 402,
  [ErrorCode.PAYMENT_FAILED]: 402,
  [ErrorCode.SUBSCRIPTION_EXPIRED]: 402,
  
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  
  [ErrorCode.BUSINESS_RULE_VIOLATION]: 422,
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
};

// Request types
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

export interface SearchQuery extends PaginationQuery {
  q?: string;
  filters?: Record<string, any>;
}
