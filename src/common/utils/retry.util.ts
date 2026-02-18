import { CarrierError } from '../errors';

export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   */
  maxRetries: number;

  /**
   * Initial backoff delay in milliseconds
   */
  initialDelayMs: number;

  /**
   * Maximum backoff delay in milliseconds
   */
  maxDelayMs: number;

  /**
   * Backoff multiplier for exponential backoff
   */
  backoffMultiplier: number;

  /**
   * Whether to add jitter to backoff delays
   */
  useJitter: boolean;

  /**
   * Custom function to determine if error is retryable
   */
  isRetryable?: (error: unknown) => boolean;
}

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  useJitter: true,
};

/**
 * Retry a function with exponential backoff
 * @param fn - Function to retry
 * @param options - Retry options
 * @returns Result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;
  let attempt = 0;

  while (attempt <= opts.maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      const isRetryable = opts.isRetryable ? opts.isRetryable(error) : isDefaultRetryable(error);

      // If not retryable or max retries reached, throw
      if (!isRetryable || attempt === opts.maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = calculateDelay(attempt, opts);

      // Wait before retrying
      await sleep(delay);

      attempt++;
    }
  }

  // Should never reach here, but TypeScript doesn't know that
  throw lastError;
}

/**
 * Default retryable check - uses CarrierError.isRetryable if available
 */
function isDefaultRetryable(error: unknown): boolean {
  if (error instanceof CarrierError) {
    return error.isRetryable;
  }
  // By default, don't retry unknown errors
  return false;
}

/**
 * Calculate delay for exponential backoff with optional jitter
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
  // Calculate exponential delay
  let delay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt);

  // Cap at max delay
  delay = Math.min(delay, options.maxDelayMs);

  // Add jitter if enabled (randomize ±25%)
  if (options.useJitter) {
    const jitterRange = delay * 0.25;
    const jitter = Math.random() * jitterRange * 2 - jitterRange;
    delay = delay + jitter;
  }

  return Math.floor(delay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
