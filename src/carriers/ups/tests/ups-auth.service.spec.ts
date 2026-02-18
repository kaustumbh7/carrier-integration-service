import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AxiosResponse, AxiosError } from 'axios';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpsAuthService } from '../ups-auth.service';
import upsConfig from '../ups.config';
import { CarrierAuthError } from '@common/errors';
import tokenFixture from '../../../../test/fixtures/ups/auth-token-response.json';

// Set required env vars for tests
process.env.UPS_CLIENT_ID = 'test_client_id';
process.env.UPS_CLIENT_SECRET = 'test_client_secret';
process.env.UPS_ACCOUNT_NUMBER = 'TEST123';
process.env.UPS_MOCK_MODE = 'false';

describe('UpsAuthService', () => {
  let service: UpsAuthService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        HttpModule,
        ConfigModule.forRoot({
          load: [upsConfig],
          isGlobal: true,
        }),
      ],
      providers: [UpsAuthService],
    }).compile();

    service = module.get<UpsAuthService>(UpsAuthService);
    httpService = module.get<HttpService>(HttpService);

    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('getToken', () => {
    it('should acquire and return a valid token', async () => {
      // Use current time for issued_at to ensure token is not expired
      const freshTokenData = {
        ...tokenFixture,
        issued_at: String(Date.now()),
      };

      // Mock successful token response
      const mockResponse: AxiosResponse = {
        data: freshTokenData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      const token = await service.getToken();

      expect(token).toBe(tokenFixture.access_token);
      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        'grant_type=client_credentials',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: expect.stringContaining('Basic '),
          }),
        }),
      );
    });

    it('should cache and reuse valid tokens', async () => {
      // Use current time for issued_at to ensure token is not expired
      const freshTokenData = {
        ...tokenFixture,
        issued_at: String(Date.now()),
      };

      const mockResponse: AxiosResponse = {
        data: freshTokenData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const postSpy = vi.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      // First call - should hit API
      const token1 = await service.getToken();
      expect(postSpy).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const token2 = await service.getToken();
      expect(postSpy).toHaveBeenCalledTimes(1); // Still 1
      expect(token1).toBe(token2);
    });

    it('should refresh expired tokens', async () => {
      const expiredTokenData = {
        ...tokenFixture,
        issued_at: String(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        expires_in: '14399', // ~4 hours
      };

      const newTokenData = {
        ...tokenFixture,
        access_token: 'new_token',
      };

      const mockExpiredResponse: AxiosResponse = {
        data: expiredTokenData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const mockNewResponse: AxiosResponse = {
        data: newTokenData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const postSpy = vi
        .spyOn(httpService, 'post')
        .mockReturnValueOnce(of(mockExpiredResponse))
        .mockReturnValueOnce(of(mockNewResponse));

      // First call - gets expired token
      const token1 = await service.getToken();
      expect(token1).toBe(expiredTokenData.access_token);

      // Second call - should detect expiry and refresh
      const token2 = await service.getToken();
      expect(token2).toBe(newTokenData.access_token);
      expect(postSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent requests with mutex', async () => {
      // Use current time for issued_at to ensure token is not expired
      const freshTokenData = {
        ...tokenFixture,
        issued_at: String(Date.now()),
      };

      const mockResponse: AxiosResponse = {
        data: freshTokenData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      // Add delay to simulate slow API using rxjs delay operator
      const postSpy = vi
        .spyOn(httpService, 'post')
        .mockReturnValue(of(mockResponse).pipe(delay(100)));

      // Make 3 concurrent requests
      const [token1, token2, token3] = await Promise.all([
        service.getToken(),
        service.getToken(),
        service.getToken(),
      ]);

      // Should only make one API call despite 3 requests
      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(token1).toBe(token2);
      expect(token2).toBe(token3);
    });

    it('should throw CarrierAuthError on 401 response', async () => {
      const errorResponse = {
        response: {
          status: 401,
          data: {
            response: {
              errors: [{ code: '10002', message: 'Invalid credentials' }],
            },
          },
        },
        isAxiosError: true,
      } as AxiosError;

      vi.spyOn(httpService, 'post').mockReturnValue(throwError(() => errorResponse));

      await expect(service.getToken()).rejects.toThrow(CarrierAuthError);
    });

    it('should invalidate token on demand', async () => {
      // Use current time for issued_at to ensure token is not expired
      const freshTokenData = {
        ...tokenFixture,
        issued_at: String(Date.now()),
      };

      const mockResponse: AxiosResponse = {
        data: freshTokenData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const postSpy = vi.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      // Get token
      await service.getToken();
      expect(postSpy).toHaveBeenCalledTimes(1);

      // Invalidate
      service.invalidate();

      // Get token again - should call API
      await service.getToken();
      expect(postSpy).toHaveBeenCalledTimes(2);
    });
  });
});
