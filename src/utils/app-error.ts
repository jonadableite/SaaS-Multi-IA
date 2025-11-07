import { IgniterResponseError, type IgniterCommonErrorCode } from '@igniter-js/core'

/**
 * @enum AppErrorCode
 * @description Centralized error codes for the Multi-IA system
 */
export enum AppErrorCode {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',
  
  // Billing & Credits
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  BILLING_ERROR = 'BILLING_ERROR',
  SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // AI Provider errors
  AI_PROVIDER_ERROR = 'AI_PROVIDER_ERROR',
  AI_PROVIDER_TIMEOUT = 'AI_PROVIDER_TIMEOUT',
  AI_PROVIDER_UNAVAILABLE = 'AI_PROVIDER_UNAVAILABLE',
  
  // Third-party errors
  THIRD_PARTY_ERROR = 'THIRD_PARTY_ERROR',
  
  // Internal errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

/**
 * @interface AppErrorDetails
 * @description Base structure for application error details
 */
export interface AppErrorDetails {
  code: AppErrorCode | IgniterCommonErrorCode
  message: string
  field?: string
  context?: Record<string, unknown>
}

/**
 * @class AppError
 * @extends {IgniterResponseError<AppErrorCode | IgniterCommonErrorCode, AppErrorDetails>}
 * @description Centralized error class for the Multi-IA system with type-safe error handling
 *
 * This error class provides standardized error handling across the application,
 * mapping error codes to appropriate HTTP status codes and providing context
 * for better debugging and user experience.
 *
 * @example
 * ```typescript
 * // Validation error
 * throw new AppError(
 *   {
 *     code: AppErrorCode.VALIDATION_ERROR,
 *     message: 'Invalid email format',
 *     field: 'email'
 *   },
 *   400
 * )
 *
 * // Insufficient credits
 * throw new AppError(
 *   {
 *     code: AppErrorCode.INSUFFICIENT_CREDITS,
 *     message: 'Insufficient credits to complete this operation',
 *     context: { required: 100, available: 50 }
 *   },
 *   402
 * )
 * ```
 */
export class AppError extends IgniterResponseError<
  AppErrorCode | IgniterCommonErrorCode,
  AppErrorDetails
> {
  public readonly status: number
  public readonly details: AppErrorDetails

  constructor(details: AppErrorDetails, status: number = 400) {
    super({
      code: details.code,
      message: details.message,
      data: details,
    })

    this.status = status
    this.details = details
  }

  /**
   * @static createValidationError
   * @description Creates a validation error with field information
   */
  static createValidationError(
    message: string,
    field?: string,
  ): AppError {
    return new AppError(
      {
        code: AppErrorCode.VALIDATION_ERROR,
        message,
        field,
      },
      400,
    )
  }

  /**
   * @static createNotFoundError
   * @description Creates a not found error
   */
  static createNotFoundError(resource: string): AppError {
    return new AppError(
      {
        code: AppErrorCode.NOT_FOUND,
        message: `${resource} not found`,
      },
      404,
    )
  }

  /**
   * @static createUnauthorizedError
   * @description Creates an unauthorized error
   */
  static createUnauthorizedError(message: string = 'Unauthorized'): AppError {
    return new AppError(
      {
        code: AppErrorCode.UNAUTHORIZED,
        message,
      },
      401,
    )
  }

  /**
   * @static createForbiddenError
   * @description Creates a forbidden error
   */
  static createForbiddenError(message: string = 'Forbidden'): AppError {
    return new AppError(
      {
        code: AppErrorCode.FORBIDDEN,
        message,
      },
      403,
    )
  }

  /**
   * @static createInsufficientCreditsError
   * @description Creates an insufficient credits error
   */
  static createInsufficientCreditsError(
    required: number,
    available: number,
  ): AppError {
    return new AppError(
      {
        code: AppErrorCode.INSUFFICIENT_CREDITS,
        message: `Insufficient credits. Required: ${required}, Available: ${available}`,
        context: { required, available },
      },
      402,
    )
  }

  /**
   * @static createAIProviderError
   * @description Creates an AI provider error
   */
  static createAIProviderError(
    provider: string,
    message: string,
    context?: Record<string, unknown>,
  ): AppError {
    return new AppError(
      {
        code: AppErrorCode.AI_PROVIDER_ERROR,
        message: `AI Provider Error (${provider}): ${message}`,
        context: { provider, ...context },
      },
      502,
    )
  }

  /**
   * @static createRateLimitError
   * @description Creates a rate limit error
   */
  static createRateLimitError(
    limit: number,
    retryAfter?: number,
  ): AppError {
    return new AppError(
      {
        code: AppErrorCode.RATE_LIMIT_EXCEEDED,
        message: `Rate limit exceeded. Maximum ${limit} requests allowed`,
        context: { limit, retryAfter },
      },
      429,
    )
  }
}

