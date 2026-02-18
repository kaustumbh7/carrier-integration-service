import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigType } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { CarrierAdapter } from '@domain/ports';
import { RateRequest, RateResponse, RateRequestSchema } from '@domain/schemas';
import { CarrierValidationError, CarrierResponseParseError, ErrorMapper } from '@common/errors';
import { withRetry } from '@common/utils';
import { UpsAuthService } from './ups-auth.service';
import { UpsMapper } from './ups.mapper';
import { UpsRateResponse } from './ups.types';
import upsConfig from './ups.config';
import { DEFAULT_REQUEST_OPTION } from './ups.constants';
import rateShopFixture from '../../../test/fixtures/ups/rate-shop-response.json';

/**
 * Zod schema for UPS rate response validation
 */
const UpsRateResponseSchema = z.object({
  RateResponse: z.object({
    Response: z.object({
      ResponseStatus: z.object({
        Code: z.string(),
        Description: z.string(),
      }),
      Alert: z
        .array(
          z.object({
            Code: z.string(),
            Description: z.string(),
          }),
        )
        .optional(),
      TransactionReference: z
        .object({
          CustomerContext: z.string().optional(),
        })
        .optional(),
    }),
    RatedShipment: z.array(z.any()),
  }),
});

/**
 * UPS Carrier Adapter Implementation
 * Implements the CarrierAdapter interface for UPS rating operations
 */
@Injectable()
export class UpsService implements CarrierAdapter {
  readonly carrierCode = 'ups';

  constructor(
    private readonly httpService: HttpService,
    private readonly authService: UpsAuthService,
    @Inject(upsConfig.KEY)
    private readonly config: ConfigType<typeof upsConfig>,
  ) {}

  /**
   * Get shipping rates from UPS
   * @param request - Rate request with origin, destination, and packages
   * @returns Normalized rate quotes
   */
  async getRates(request: RateRequest): Promise<RateResponse> {
    // Validate request against schema (even in mock mode)
    const validationResult = RateRequestSchema.safeParse(request);
    if (!validationResult.success) {
      throw new CarrierValidationError(
        'Invalid rate request',
        this.carrierCode,
        'VALIDATION_ERROR',
        400,
        { errors: validationResult.error.errors },
      );
    }

    // Return mock data if in mock mode
    if (this.config.mockMode) {
      return UpsMapper.fromUpsRateResponse(rateShopFixture as any, uuidv4());
    }

    // Use retry wrapper for transient failures
    return withRetry(
      async () => {
        return this.executeRateRequest(request);
      },
      {
        maxRetries: 2,
        initialDelayMs: 1000,
        maxDelayMs: 5000,
      },
    );
  }

  /**
   * Execute the actual rate request (separated for retry logic)
   */
  private async executeRateRequest(request: RateRequest): Promise<RateResponse> {
    try {
      // Get auth token
      const token = await this.authService.getToken();

      // Map domain request to UPS request
      const upsRequest = UpsMapper.toUpsRateRequest(request, this.config);

      // Determine request option (Rate for specific service, Shop for all)
      const requestOption = request.serviceCode ? 'Rate' : DEFAULT_REQUEST_OPTION;

      // Build endpoint URL
      const endpoint = `/api/rating/${this.config.apiVersion}/${requestOption}`;
      const url = `${this.config.baseUrl}${endpoint}`;

      // Generate transaction ID for tracing
      const transactionId = uuidv4();

      // Make API request
      const response = await firstValueFrom(
        this.httpService.post<UpsRateResponse>(url, upsRequest, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            transId: transactionId,
            transactionSrc: this.config.transactionSrc,
          },
          timeout: 15000, // 15 second timeout
        }),
      );

      // Validate response structure
      const validationResult = UpsRateResponseSchema.safeParse(response.data);
      if (!validationResult.success) {
        throw new CarrierResponseParseError(
          'Invalid response structure from UPS',
          this.carrierCode,
          'PARSE_ERROR',
          response.status,
          { errors: validationResult.error.errors },
        );
      }

      // Map UPS response to domain response
      return UpsMapper.fromUpsRateResponse(response.data, transactionId);
    } catch (error) {
      // Handle auth errors by invalidating token and retrying once
      if (this.isAuthError(error)) {
        this.authService.invalidate();
      }

      // Map and re-throw as structured error
      throw ErrorMapper.mapAxiosError(error, this.carrierCode);
    }
  }

  /**
   * Check if error is an authentication error (401)
   */
  private isAuthError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof (error as any).response === 'object' &&
      (error as any).response?.status === 401
    );
  }
}
