import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigType } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';
import upsConfig from './ups.config';
import { UpsTokenResponse } from './ups.types';
import { CarrierAuthError } from '@common/errors';
import { ErrorMapper } from '@common/errors';

/**
 * Zod schema for UPS token response validation
 */
const UpsTokenSchema = z.object({
  token_type: z.string(),
  issued_at: z.string(),
  client_id: z.string(),
  access_token: z.string(),
  expires_in: z.string(),
  status: z.string(),
});

/**
 * Service responsible for UPS OAuth token management
 * Handles token acquisition, caching, and refresh
 */
@Injectable()
export class UpsAuthService {
  private cachedToken: string | null = null;
  private expiresAt: number = 0;
  private refreshPromise: Promise<string> | null = null;

  // Buffer time before token expiry to proactively refresh (60 seconds)
  private readonly TOKEN_BUFFER_MS = 60 * 1000;

  constructor(
    private readonly httpService: HttpService,
    @Inject(upsConfig.KEY)
    private readonly config: ConfigType<typeof upsConfig>,
  ) {}

  /**
   * Get a valid access token (from cache or by acquiring a new one)
   * @returns Valid Bearer token
   */
  async getToken(): Promise<string> {
    // Return mock token if in mock mode
    if (this.config.mockMode) {
      return 'mock_token_12345';
    }

    // Return cached token if still valid
    if (this.cachedToken && this.isTokenValid()) {
      return this.cachedToken;
    }

    // If refresh is already in progress, wait for it (mutex pattern)
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Start token acquisition
    this.refreshPromise = this.acquireToken();

    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Invalidate cached token (call this on 401 errors)
   */
  invalidate(): void {
    this.cachedToken = null;
    this.expiresAt = 0;
  }

  /**
   * Check if cached token is still valid (with buffer)
   */
  private isTokenValid(): boolean {
    return Date.now() < this.expiresAt - this.TOKEN_BUFFER_MS;
  }

  /**
   * Acquire a new token from UPS OAuth endpoint
   */
  private async acquireToken(): Promise<string> {
    try {
      // Create Basic auth header: base64(client_id:client_secret)
      const credentials = Buffer.from(
        `${this.config.clientId}:${this.config.clientSecret}`,
      ).toString('base64');

      // Make token request
      const response = await firstValueFrom(
        this.httpService.post<UpsTokenResponse>(
          this.config.oauthUrl,
          'grant_type=client_credentials',
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${credentials}`,
            },
          },
        ),
      );

      // Validate response shape
      const validationResult = UpsTokenSchema.safeParse(response.data);
      if (!validationResult.success) {
        throw new CarrierAuthError(
          'Invalid token response from UPS',
          'ups',
          'INVALID_TOKEN_RESPONSE',
          response.status,
          { errors: validationResult.error.errors },
        );
      }

      const tokenData = validationResult.data;

      // Cache token and calculate expiry
      this.cachedToken = tokenData.access_token;

      // expires_in is in seconds (as string), issued_at is unix timestamp in ms (as string)
      const expiresInMs = parseInt(tokenData.expires_in, 10) * 1000;
      const issuedAt = parseInt(tokenData.issued_at, 10);

      // Calculate expiry timestamp
      this.expiresAt = issuedAt + expiresInMs;

      return this.cachedToken;
    } catch (error) {
      // Clear cache on error
      this.invalidate();

      // Map to structured error
      if (error instanceof CarrierAuthError) {
        throw error;
      }

      throw ErrorMapper.mapAxiosError(error, 'ups');
    }
  }
}
