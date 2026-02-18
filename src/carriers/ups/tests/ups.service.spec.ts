import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpsService } from '../ups.service';
import { UpsAuthService } from '../ups-auth.service';
import upsConfig from '../ups.config';
import { RateRequest } from '@domain/schemas';
import {
  CarrierValidationError,
  CarrierServiceError,
  CarrierResponseParseError,
  CarrierRateLimitError,
  CarrierNetworkError,
} from '@common/errors';
import rateShopFixture from '../../../../test/fixtures/ups/rate-shop-response.json';
import errorInvalidPostalFixture from '../../../../test/fixtures/ups/error-invalid-postal.json';
import errorServiceUnavailableFixture from '../../../../test/fixtures/ups/error-service-unavailable.json';

// Set required env vars for tests
process.env.UPS_CLIENT_ID = 'test_client_id';
process.env.UPS_CLIENT_SECRET = 'test_client_secret';
process.env.UPS_ACCOUNT_NUMBER = 'TEST123';
process.env.UPS_MOCK_MODE = 'false';

describe('UpsService', () => {
  let service: UpsService;
  let httpService: HttpService;
  let authService: UpsAuthService;

  const mockRateRequest: RateRequest = {
    origin: {
      addressLines: ['123 Main St'],
      city: 'Atlanta',
      stateProvinceCode: 'GA',
      postalCode: '30301',
      countryCode: 'US',
      isResidential: false,
    },
    destination: {
      addressLines: ['456 Oak Ave'],
      city: 'New York',
      stateProvinceCode: 'NY',
      postalCode: '10001',
      countryCode: 'US',
      isResidential: true,
    },
    packages: [
      {
        weight: {
          value: 5.0,
          unit: 'LB',
        },
        dimensions: {
          length: 10,
          width: 8,
          height: 6,
          unit: 'IN',
        },
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        HttpModule,
        ConfigModule.forRoot({
          load: [upsConfig],
          isGlobal: true,
        }),
      ],
      providers: [UpsService, UpsAuthService],
    }).compile();

    service = module.get<UpsService>(UpsService);
    httpService = module.get<HttpService>(HttpService);
    authService = module.get<UpsAuthService>(UpsAuthService);
  });

  describe('getRates', () => {
    it('should successfully get rates (Shop mode)', async () => {
      // Mock auth token
      vi.spyOn(authService, 'getToken').mockResolvedValue('mock_token');

      // Mock successful rate response
      const mockResponse: AxiosResponse = {
        data: rateShopFixture,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const postSpy = vi.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      const response = await service.getRates(mockRateRequest);

      expect(response.quotes).toHaveLength(3);
      expect(response.quotes[0].carrier).toBe('ups');
      expect(response.quotes[0].serviceCode).toBe('03');
      expect(response.quotes[0].totalCharges).toBe(12.35);

      // Verify request was made correctly
      expect(postSpy).toHaveBeenCalledWith(
        expect.stringContaining('/Shop'),
        expect.objectContaining({
          RateRequest: expect.any(Object),
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock_token',
            'Content-Type': 'application/json',
            transId: expect.any(String),
          }),
        }),
      );
    });

    it('should use Rate endpoint when service code is specified', async () => {
      vi.spyOn(authService, 'getToken').mockResolvedValue('mock_token');

      const mockResponse: AxiosResponse = {
        data: rateShopFixture,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const postSpy = vi.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      const requestWithServiceCode = {
        ...mockRateRequest,
        serviceCode: '03',
      };

      await service.getRates(requestWithServiceCode);

      expect(postSpy).toHaveBeenCalledWith(
        expect.stringContaining('/Rate'),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should throw CarrierValidationError for invalid request', async () => {
      const invalidRequest = {
        ...mockRateRequest,
        packages: [], // Empty packages array is invalid
      };

      await expect(service.getRates(invalidRequest)).rejects.toThrow(CarrierValidationError);
    });

    it('should throw CarrierValidationError on 400 response', async () => {
      vi.spyOn(authService, 'getToken').mockResolvedValue('mock_token');

      const errorResponse: AxiosError = {
        response: {
          status: 400,
          data: errorInvalidPostalFixture,
          statusText: 'Bad Request',
          headers: {},
          config: {} as any,
        },
        isAxiosError: true,
        toJSON: () => ({}),
      } as any;

      vi.spyOn(httpService, 'post').mockReturnValue(throwError(() => errorResponse));

      await expect(service.getRates(mockRateRequest)).rejects.toThrow(CarrierValidationError);
    });

    it('should throw CarrierServiceError on 503 response', async () => {
      vi.spyOn(authService, 'getToken').mockResolvedValue('mock_token');

      const errorResponse: AxiosError = {
        response: {
          status: 503,
          data: errorServiceUnavailableFixture,
          statusText: 'Service Unavailable',
          headers: {},
          config: {} as any,
        },
        isAxiosError: true,
        toJSON: () => ({}),
      } as any;

      vi.spyOn(httpService, 'post').mockReturnValue(throwError(() => errorResponse));

      await expect(service.getRates(mockRateRequest)).rejects.toThrow(CarrierServiceError);
    });

    it('should throw CarrierRateLimitError on 429 response', async () => {
      vi.spyOn(authService, 'getToken').mockResolvedValue('mock_token');

      const errorResponse: AxiosError = {
        response: {
          status: 429,
          data: {
            response: {
              errors: [{ code: '250001', message: 'Rate limit exceeded' }],
            },
          },
          statusText: 'Too Many Requests',
          headers: {
            'retry-after': '60',
          },
          config: {} as any,
        },
        isAxiosError: true,
        toJSON: () => ({}),
      } as any;

      vi.spyOn(httpService, 'post').mockReturnValue(throwError(() => errorResponse));

      try {
        await service.getRates(mockRateRequest);
        expect.fail('Should have thrown CarrierRateLimitError');
      } catch (error) {
        expect(error).toBeInstanceOf(CarrierRateLimitError);
        if (error instanceof CarrierRateLimitError) {
          expect(error.retryAfterSeconds).toBe(60);
        }
      }
    });

    it('should throw CarrierNetworkError on timeout', async () => {
      vi.spyOn(authService, 'getToken').mockResolvedValue('mock_token');

      const timeoutError: AxiosError = {
        code: 'ETIMEDOUT',
        message: 'timeout of 15000ms exceeded',
        isAxiosError: true,
        toJSON: () => ({}),
      } as any;

      vi.spyOn(httpService, 'post').mockReturnValue(throwError(() => timeoutError));

      await expect(service.getRates(mockRateRequest)).rejects.toThrow(CarrierNetworkError);
    });

    it('should throw CarrierResponseParseError on malformed JSON', async () => {
      vi.spyOn(authService, 'getToken').mockResolvedValue('mock_token');

      const mockResponse: AxiosResponse = {
        data: { invalid: 'structure' }, // Missing required RateResponse structure
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      await expect(service.getRates(mockRateRequest)).rejects.toThrow(CarrierResponseParseError);
    });

    it('should invalidate token and retry on 401 error', async () => {
      const invalidateSpy = vi.spyOn(authService, 'invalidate');
      const getTokenSpy = vi
        .spyOn(authService, 'getToken')
        .mockResolvedValueOnce('old_token')
        .mockResolvedValueOnce('new_token');

      const unauthorizedError: AxiosError = {
        response: {
          status: 401,
          data: {
            response: {
              errors: [{ code: '10001', message: 'Invalid token' }],
            },
          },
          statusText: 'Unauthorized',
          headers: {},
          config: {} as any,
        },
        isAxiosError: true,
        toJSON: () => ({}),
      } as any;

      const successResponse: AxiosResponse = {
        data: rateShopFixture,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      // First call returns 401, second call succeeds
      const postSpy = vi
        .spyOn(httpService, 'post')
        .mockReturnValueOnce(throwError(() => unauthorizedError))
        .mockReturnValueOnce(of(successResponse));

      const response = await service.getRates(mockRateRequest);

      // Should have invalidated token
      expect(invalidateSpy).toHaveBeenCalled();

      // Should have made 2 requests (original + retry)
      expect(postSpy).toHaveBeenCalledTimes(2);

      // Final response should be successful
      expect(response.quotes).toHaveLength(3);
    });
  });

  describe('carrierCode', () => {
    it('should return "ups" as carrier code', () => {
      expect(service.carrierCode).toBe('ups');
    });
  });
});
