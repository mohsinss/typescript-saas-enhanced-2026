import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/next-auth";
import { ApiResponse, ApiError, ErrorCode } from "@/lib/types/api";
import { BaseError, ValidationError, AuthenticationError, normalizeError } from "@/lib/errors";
import { logger } from "@/lib/infrastructure/logger";
import { checkRateLimit, RateLimitConfig } from "@/lib/middleware/rateLimit";

interface HandlerContext {
  requestId: string;
  session?: any;
  params: Record<string, string>;
}

interface HandlerOptions<T = any> {
  schema?: z.ZodSchema<T>;
  requireAuth?: boolean;
  requireSubscription?: boolean;
  rateLimit?: RateLimitConfig;
}

type HandlerFunction<T = any, R = any> = (
  req: NextRequest,
  context: HandlerContext,
  data?: T
) => Promise<ApiResponse<R>>;

/** Next.js 15+ route context with async params */
interface RouteContext {
  params: Promise<Record<string, string>>;
}

/**
 * Creates a standardized API handler with built-in features:
 * - Request validation
 * - Authentication checks
 * - Rate limiting
 * - Error handling
 * - Logging
 */
export function createHandler<T = any, R = any>(
  handler: HandlerFunction<T, R>,
  options: HandlerOptions<T> = {}
) {
  return async (
    req: NextRequest,
    context: RouteContext
  ): Promise<NextResponse> => {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    
    // Log incoming request
    logger.apiRequest(req.method, req.url, { requestId });
    
    try {
      // Rate limiting
      if (options.rateLimit) {
        await checkRateLimit(req, options.rateLimit);
      }
      
      // Authentication check
      let session = null;
      if (options.requireAuth) {
        session = await getServerSession(authOptions);
        
        if (!session?.user) {
          throw new AuthenticationError();
        }
        
        // Subscription check
        if (options.requireSubscription) {
          // TODO: Check if user has active subscription
          // const user = await getUserById(session.user.id);
          // if (!user.hasAccess) {
          //   throw new PaymentRequiredError();
          // }
        }
      }
      
      // Parse and validate request body
      let validatedData: T | undefined;
      if (options.schema && ["POST", "PUT", "PATCH"].includes(req.method)) {
        const body = await req.json();
        const result = options.schema.safeParse(body);
        
        if (!result.success) {
          throw new ValidationError(
            "Invalid request data",
            result.error.flatten()
          );
        }
        
        validatedData = result.data;
      }
      
      // Execute handler
      const params = context?.params ? await context.params : {};
      const handlerContext: HandlerContext = {
        requestId,
        session,
        params,
      };
      
      const response = await handler(req, handlerContext, validatedData);
      
      // Log successful response
      const duration = Date.now() - startTime;
      logger.info("API request completed", {
        requestId,
        duration,
        method: req.method,
        path: req.url,
        status: 200,
      });
      
      // Return success response
      return NextResponse.json(response, {
        status: 200,
        headers: {
          "X-Request-Id": requestId,
          "X-Response-Time": `${duration}ms`,
          "X-API-Version": "v1",
        },
      });
      
    } catch (error) {
      // Handle errors
      const duration = Date.now() - startTime;
      const normalizedError = normalizeError(error);
      
      // Log based on error type - operational errors (4xx) are warnings, not errors
      const logContext = {
        requestId,
        duration,
        method: req.method,
        path: req.url,
        statusCode: normalizedError.statusCode,
      };
      
      if (normalizedError.isOperational && normalizedError.statusCode < 500) {
        // Expected client errors (404, 400, 401, etc.) - log as debug/info
        logger.debug(`Client error: ${normalizedError.message}`, logContext);
      } else {
        // Unexpected server errors (5xx) - log as error
        logger.error("API request failed", normalizedError, logContext);
      }
      
      // Create error response
      const errorResponse: ApiError = {
        code: normalizedError.code,
        message: normalizedError.message,
        details: normalizedError.details,
        timestamp: new Date().toISOString(),
        requestId,
        path: req.url,
      };
      
      // Return error response
      return NextResponse.json(
        {
          success: false,
          error: errorResponse,
        } as ApiResponse,
        {
          status: normalizedError.statusCode,
          headers: {
            "X-Request-Id": requestId,
            "X-Response-Time": `${duration}ms`,
            "X-API-Version": "v1",
          },
        }
      );
    }
  };
}

/**
 * Creates a public API handler (no auth required)
 */
export function createPublicHandler<T = any, R = any>(
  handler: HandlerFunction<T, R>,
  options: Omit<HandlerOptions<T>, "requireAuth" | "requireSubscription"> = {}
) {
  return createHandler(handler, { ...options, requireAuth: false });
}

/**
 * Creates a protected API handler (auth required)
 */
export function createProtectedHandler<T = any, R = any>(
  handler: HandlerFunction<T, R>,
  options: Omit<HandlerOptions<T>, "requireAuth"> = {}
) {
  return createHandler(handler, { ...options, requireAuth: true });
}

/**
 * Creates a subscription-required API handler
 */
export function createSubscriptionHandler<T = any, R = any>(
  handler: HandlerFunction<T, R>,
  options: Omit<HandlerOptions<T>, "requireAuth" | "requireSubscription"> = {}
) {
  return createHandler(handler, { 
    ...options, 
    requireAuth: true,
    requireSubscription: true 
  });
}
