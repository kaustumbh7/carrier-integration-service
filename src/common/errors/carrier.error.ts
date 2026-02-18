/**
 * Base error class for all carrier-related errors
 */
export abstract class CarrierError extends Error {
  constructor(
    message: string,
    public readonly carrierCode: string,
    public readonly errorCode: string,
    public readonly httpStatus?: number,
    public readonly isRetryable: boolean = false,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      carrierCode: this.carrierCode,
      errorCode: this.errorCode,
      httpStatus: this.httpStatus,
      isRetryable: this.isRetryable,
      details: this.details,
    };
  }
}

/**
 * Authentication/authorization errors (401, 403)
 * Non-retryable without credential updates
 */
export class CarrierAuthError extends CarrierError {
  constructor(
    message: string,
    carrierCode: string,
    errorCode: string,
    httpStatus?: number,
    details?: Record<string, unknown>,
  ) {
    super(message, carrierCode, errorCode, httpStatus, false, details);
  }
}

/**
 * Validation errors - invalid request data (400)
 * Non-retryable without request changes
 */
export class CarrierValidationError extends CarrierError {
  constructor(
    message: string,
    carrierCode: string,
    errorCode: string,
    httpStatus?: number,
    details?: Record<string, unknown>,
  ) {
    super(message, carrierCode, errorCode, httpStatus, false, details);
  }
}

/**
 * Rate limiting errors (429)
 * Retryable with backoff
 */
export class CarrierRateLimitError extends CarrierError {
  constructor(
    message: string,
    carrierCode: string,
    errorCode: string,
    public readonly retryAfterSeconds?: number,
    details?: Record<string, unknown>,
  ) {
    super(message, carrierCode, errorCode, 429, true, details);
  }
}

/**
 * Network-level errors (timeouts, connection refused)
 * Retryable
 */
export class CarrierNetworkError extends CarrierError {
  constructor(
    message: string,
    carrierCode: string,
    errorCode: string,
    details?: Record<string, unknown>,
  ) {
    super(message, carrierCode, errorCode, undefined, true, details);
  }
}

/**
 * Server errors from carrier (5xx)
 * Retryable
 */
export class CarrierServiceError extends CarrierError {
  constructor(
    message: string,
    carrierCode: string,
    errorCode: string,
    httpStatus?: number,
    details?: Record<string, unknown>,
  ) {
    super(message, carrierCode, errorCode, httpStatus, true, details);
  }
}

/**
 * Response parsing errors - unexpected response format
 * Non-retryable (indicates API contract change)
 */
export class CarrierResponseParseError extends CarrierError {
  constructor(
    message: string,
    carrierCode: string,
    errorCode: string,
    httpStatus?: number,
    details?: Record<string, unknown>,
  ) {
    super(message, carrierCode, errorCode, httpStatus, false, details);
  }
}

/**
 * Generic carrier error for uncategorized failures
 */
export class CarrierUnknownError extends CarrierError {
  constructor(
    message: string,
    carrierCode: string,
    errorCode: string,
    httpStatus?: number,
    details?: Record<string, unknown>,
  ) {
    super(message, carrierCode, errorCode, httpStatus, false, details);
  }
}
