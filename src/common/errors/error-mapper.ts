import { AxiosError } from 'axios';
import {
  CarrierAuthError,
  CarrierNetworkError,
  CarrierRateLimitError,
  CarrierResponseParseError,
  CarrierServiceError,
  CarrierUnknownError,
  CarrierValidationError,
} from './carrier.error';

/**
 * Maps axios errors to structured carrier errors
 */
export class ErrorMapper {
  /**
   * Map an axios error to a carrier-specific error
   * @param error - Axios error or generic error
   * @param carrierCode - Carrier code (e.g., "ups")
   * @returns Structured carrier error
   */
  static mapAxiosError(error: unknown, carrierCode: string) {
    // Handle axios errors
    if (this.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Network errors (no response received)
      if (!axiosError.response) {
        if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
          return new CarrierNetworkError(
            `Request timeout: ${axiosError.message}`,
            carrierCode,
            'TIMEOUT',
            { code: axiosError.code },
          );
        }

        return new CarrierNetworkError(
          `Network error: ${axiosError.message}`,
          carrierCode,
          'NETWORK_ERROR',
          { code: axiosError.code },
        );
      }

      const status = axiosError.response.status;
      const data = axiosError.response.data as any;

      // Extract error message and code from response
      const errorMessage = this.extractErrorMessage(data);
      const errorCode = this.extractErrorCode(data);

      // Map by status code
      switch (status) {
        case 401:
        case 403:
          return new CarrierAuthError(errorMessage, carrierCode, errorCode, status, data);

        case 400:
        case 422:
          return new CarrierValidationError(errorMessage, carrierCode, errorCode, status, data);

        case 429:
          const retryAfter = this.extractRetryAfter(axiosError.response.headers);
          return new CarrierRateLimitError(errorMessage, carrierCode, errorCode, retryAfter, data);

        case 500:
        case 502:
        case 503:
        case 504:
          return new CarrierServiceError(errorMessage, carrierCode, errorCode, status, data);

        default:
          if (status >= 400 && status < 500) {
            return new CarrierValidationError(errorMessage, carrierCode, errorCode, status, data);
          }
          if (status >= 500) {
            return new CarrierServiceError(errorMessage, carrierCode, errorCode, status, data);
          }
          return new CarrierUnknownError(errorMessage, carrierCode, errorCode, status, data);
      }
    }

    // Handle parse errors
    if (error instanceof SyntaxError) {
      return new CarrierResponseParseError(
        `Failed to parse carrier response: ${error.message}`,
        carrierCode,
        'PARSE_ERROR',
        undefined,
        { originalError: error.message },
      );
    }

    // Generic unknown error
    const message = error instanceof Error ? error.message : String(error);
    return new CarrierUnknownError(message, carrierCode, 'UNKNOWN_ERROR', undefined, {
      originalError: String(error),
    });
  }

  /**
   * Type guard for axios errors
   */
  private static isAxiosError(error: unknown): error is AxiosError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'isAxiosError' in error &&
      (error as any).isAxiosError === true
    );
  }

  /**
   * Extract error message from carrier response
   */
  private static extractErrorMessage(data: any): string {
    if (!data) return 'Unknown error';

    // Common patterns across carriers
    if (typeof data === 'string') return data;
    if (data.message) return data.message;
    if (data.error?.message) return data.error.message;
    if (data.response?.errors?.[0]?.message) return data.response.errors[0].message;
    if (data.errors?.[0]?.message) return data.errors[0].message;

    return 'Unknown error';
  }

  /**
   * Extract error code from carrier response
   */
  private static extractErrorCode(data: any): string {
    if (!data) return 'UNKNOWN';

    if (data.code) return String(data.code);
    if (data.errorCode) return String(data.errorCode);
    if (data.error_code) return String(data.error_code);
    if (data.response?.errors?.[0]?.code) return String(data.response.errors[0].code);
    if (data.errors?.[0]?.code) return String(data.errors[0].code);

    return 'UNKNOWN';
  }

  /**
   * Extract retry-after value from response headers
   */
  private static extractRetryAfter(headers: any): number | undefined {
    if (!headers) return undefined;

    const retryAfter = headers['retry-after'] || headers['Retry-After'];
    if (!retryAfter) return undefined;

    const seconds = parseInt(retryAfter, 10);
    return isNaN(seconds) ? undefined : seconds;
  }
}
