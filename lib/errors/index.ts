import { ErrorCode, ErrorStatusMap } from "@/lib/types/api";

/**
 * Base error class for all application errors
 */
export abstract class BaseError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: ErrorCode,
    details?: unknown,
    isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = ErrorStatusMap[code] || 500;
    this.details = details;
    this.isOperational = isOperational;
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

/**
 * Validation error - thrown when input validation fails
 */
export class ValidationError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(message, ErrorCode.VALIDATION_ERROR, details);
  }
}

/**
 * Authentication error - thrown when user is not authenticated
 */
export class AuthenticationError extends BaseError {
  constructor(message = "Authentication required") {
    super(message, ErrorCode.UNAUTHORIZED);
  }
}

/**
 * Authorization error - thrown when user lacks permissions
 */
export class AuthorizationError extends BaseError {
  constructor(message = "Insufficient permissions") {
    super(message, ErrorCode.FORBIDDEN);
  }
}

/**
 * Not found error - thrown when resource doesn't exist
 */
export class NotFoundError extends BaseError {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, ErrorCode.NOT_FOUND);
  }
}

/**
 * Conflict error - thrown when resource already exists
 */
export class ConflictError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(message, ErrorCode.ALREADY_EXISTS, details);
  }
}

/**
 * Rate limit error - thrown when rate limit is exceeded
 */
export class RateLimitError extends BaseError {
  constructor(message = "Too many requests", retryAfter?: number) {
    super(message, ErrorCode.RATE_LIMITED, { retryAfter });
  }
}

/**
 * Payment required error - thrown when payment/subscription is needed
 */
export class PaymentRequiredError extends BaseError {
  constructor(message = "Payment required to access this feature") {
    super(message, ErrorCode.PAYMENT_REQUIRED);
  }
}

/**
 * Business rule violation - thrown when business logic constraints are violated
 */
export class BusinessRuleError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(message, ErrorCode.BUSINESS_RULE_VIOLATION, details);
  }
}

/**
 * Database error - thrown when database operations fail
 */
export class DatabaseError extends BaseError {
  constructor(message = "Database operation failed", details?: unknown) {
    super(message, ErrorCode.DATABASE_ERROR, details, false);
  }
}

/**
 * External service error - thrown when external API calls fail
 */
export class ExternalServiceError extends BaseError {
  constructor(service: string, message?: string) {
    super(
      message || `External service '${service}' is unavailable`,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      { service },
      false
    );
  }
}

/**
 * Type guard to check if error is operational
 */
export function isOperationalError(error: unknown): error is BaseError {
  return error instanceof BaseError && error.isOperational;
}

/**
 * Internal error - generic server error
 */
export class InternalError extends BaseError {
  constructor(message = "An unexpected error occurred", details?: unknown) {
    super(message, ErrorCode.INTERNAL_ERROR, details, false);
  }
}

/**
 * Convert unknown error to BaseError
 */
export function normalizeError(error: unknown): BaseError {
  if (error instanceof BaseError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new InternalError(
      error.message,
      { originalError: error.name }
    );
  }
  
  return new InternalError(
    "An unexpected error occurred",
    { error }
  );
}
