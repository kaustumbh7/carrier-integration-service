import { describe, it, expect } from 'vitest';
import { UpsMapper } from '../ups.mapper';
import { RateRequest } from '@domain/schemas';
import { UpsConfig } from '../ups.config';
import rateShopFixture from '../../../../test/fixtures/ups/rate-shop-response.json';
import rateSingleFixture from '../../../../test/fixtures/ups/rate-single-response.json';

describe('UpsMapper', () => {
  const mockConfig: UpsConfig = {
    clientId: 'test_client',
    clientSecret: 'test_secret',
    accountNumber: 'TEST123',
    baseUrl: 'https://test.ups.com',
    oauthUrl: 'https://test.ups.com/oauth',
    apiVersion: 'v2403',
    transactionSrc: 'test-service',
  };

  describe('toUpsRateRequest', () => {
    it('should map domain request to UPS API structure', () => {
      const domainRequest: RateRequest = {
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
        shipperName: 'Acme Corp',
      };

      const upsRequest = UpsMapper.toUpsRateRequest(domainRequest, mockConfig);

      expect(upsRequest.RateRequest).toBeDefined();
      expect(upsRequest.RateRequest.Shipper.Name).toBe('Acme Corp');
      expect(upsRequest.RateRequest.Shipper.ShipperNumber).toBe('TEST123');
      expect(upsRequest.RateRequest.Shipper.Address.City).toBe('Atlanta');
      expect(upsRequest.RateRequest.ShipTo.Address.City).toBe('New York');
      expect(upsRequest.RateRequest.Package).toHaveLength(1);
      expect(upsRequest.RateRequest.Package[0].PackageWeight.Weight).toBe('5.0');
      expect(upsRequest.RateRequest.Package[0].Dimensions?.Length).toBe('10.0');
    });

    it('should handle multi-package requests', () => {
      const domainRequest: RateRequest = {
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
            weight: { value: 5.0, unit: 'LB' },
            dimensions: { length: 10, width: 8, height: 6, unit: 'IN' },
          },
          {
            weight: { value: 3.5, unit: 'LB' },
            dimensions: { length: 8, width: 6, height: 4, unit: 'IN' },
          },
        ],
      };

      const upsRequest = UpsMapper.toUpsRateRequest(domainRequest, mockConfig);

      expect(upsRequest.RateRequest.Package).toHaveLength(2);
      expect(upsRequest.RateRequest.NumOfPieces).toBe('2');
      expect(upsRequest.RateRequest.Package[1].PackageWeight.Weight).toBe('3.5');
    });

    it('should include service code when specified', () => {
      const domainRequest: RateRequest = {
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
            weight: { value: 5.0, unit: 'LB' },
          },
        ],
        serviceCode: '03', // UPS Ground
      };

      const upsRequest = UpsMapper.toUpsRateRequest(domainRequest, mockConfig);

      expect(upsRequest.RateRequest.Service).toBeDefined();
      expect(upsRequest.RateRequest.Service?.Code).toBe('03');
    });

    it('should handle packages without dimensions', () => {
      const domainRequest: RateRequest = {
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
            weight: { value: 5.0, unit: 'LB' },
          },
        ],
      };

      const upsRequest = UpsMapper.toUpsRateRequest(domainRequest, mockConfig);

      expect(upsRequest.RateRequest.Package[0].Dimensions).toBeUndefined();
    });
  });

  describe('fromUpsRateResponse', () => {
    it('should map UPS shop response to domain response', () => {
      const domainResponse = UpsMapper.fromUpsRateResponse(
        rateShopFixture as any,
        'test-transaction-123',
      );

      expect(domainResponse.quotes).toHaveLength(3);
      expect(domainResponse.transactionId).toBe('test-transaction-123');

      // Check first quote (UPS Ground)
      const groundQuote = domainResponse.quotes[0];
      expect(groundQuote.carrier).toBe('ups');
      expect(groundQuote.serviceCode).toBe('03');
      expect(groundQuote.serviceName).toBe('UPS Ground');
      expect(groundQuote.totalCharges).toBe(12.35);
      expect(groundQuote.negotiatedCharges).toBe(10.5);
      expect(groundQuote.currency).toBe('USD');
      expect(groundQuote.transitDays).toBe(5);
      expect(groundQuote.billingWeight?.value).toBe(5.0);
      expect(groundQuote.billingWeight?.unit).toBe('LB');
    });

    it('should map single rate response', () => {
      const domainResponse = UpsMapper.fromUpsRateResponse(rateSingleFixture as any);

      expect(domainResponse.quotes).toHaveLength(1);

      const quote = domainResponse.quotes[0];
      expect(quote.serviceCode).toBe('03');
      expect(quote.totalCharges).toBe(12.35);
      expect(quote.negotiatedCharges).toBeUndefined(); // No negotiated rates in this fixture
    });

    it('should extract warnings from alerts', () => {
      const domainResponse = UpsMapper.fromUpsRateResponse(rateShopFixture as any);

      expect(domainResponse.warnings).toBeDefined();
      expect(domainResponse.warnings).toHaveLength(1);
      expect(domainResponse.warnings?.[0]).toContain('invoice may vary');
    });

    it('should resolve service names from codes', () => {
      const domainResponse = UpsMapper.fromUpsRateResponse(rateShopFixture as any);

      const codes = domainResponse.quotes.map((q) => q.serviceCode);
      const names = domainResponse.quotes.map((q) => q.serviceName);

      expect(codes).toContain('03');
      expect(codes).toContain('02');
      expect(codes).toContain('01');

      expect(names).toContain('UPS Ground');
      expect(names).toContain('UPS 2nd Day Air');
      expect(names).toContain('UPS Next Day Air');
    });
  });
});
