import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { CarrierRegistryService } from '../carrier-registry.service';
import { CarrierAdapter } from '@domain/ports';
import { RateRequest, RateResponse } from '@domain/schemas';

// Mock carrier adapter for testing
class MockUpsAdapter implements CarrierAdapter {
  carrierCode = 'ups';
  async getRates(_request: RateRequest): Promise<RateResponse> {
    return { quotes: [] };
  }
}

class MockFedExAdapter implements CarrierAdapter {
  carrierCode = 'fedex';
  async getRates(_request: RateRequest): Promise<RateResponse> {
    return { quotes: [] };
  }
}

describe('CarrierRegistryService', () => {
  let service: CarrierRegistryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CarrierRegistryService],
    }).compile();

    service = module.get<CarrierRegistryService>(CarrierRegistryService);
  });

  describe('register', () => {
    it('should register a carrier adapter', () => {
      const adapter = new MockUpsAdapter();
      service.register(adapter);

      expect(service.has('ups')).toBe(true);
      expect(service.listCarriers()).toContain('ups');
    });

    it('should register multiple carriers', () => {
      service.register(new MockUpsAdapter());
      service.register(new MockFedExAdapter());

      expect(service.listCarriers()).toHaveLength(2);
      expect(service.listCarriers()).toContain('ups');
      expect(service.listCarriers()).toContain('fedex');
    });
  });

  describe('resolve', () => {
    it('should resolve a registered carrier', () => {
      const adapter = new MockUpsAdapter();
      service.register(adapter);

      const resolved = service.resolve('ups');

      expect(resolved).toBe(adapter);
      expect(resolved.carrierCode).toBe('ups');
    });

    it('should be case-insensitive', () => {
      const adapter = new MockUpsAdapter();
      service.register(adapter);

      expect(service.resolve('UPS')).toBe(adapter);
      expect(service.resolve('Ups')).toBe(adapter);
      expect(service.resolve('ups')).toBe(adapter);
    });

    it('should throw error for unknown carrier', () => {
      expect(() => service.resolve('unknown')).toThrow(/Carrier "unknown" not found/);
    });

    it('should include available carriers in error message', () => {
      service.register(new MockUpsAdapter());
      service.register(new MockFedExAdapter());

      try {
        service.resolve('unknown');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).toContain('ups');
        expect((error as Error).message).toContain('fedex');
      }
    });
  });

  describe('has', () => {
    it('should return true for registered carriers', () => {
      service.register(new MockUpsAdapter());

      expect(service.has('ups')).toBe(true);
    });

    it('should return false for unregistered carriers', () => {
      expect(service.has('fedex')).toBe(false);
    });

    it('should be case-insensitive', () => {
      service.register(new MockUpsAdapter());

      expect(service.has('UPS')).toBe(true);
      expect(service.has('Ups')).toBe(true);
    });
  });

  describe('listCarriers', () => {
    it('should return empty array when no carriers registered', () => {
      expect(service.listCarriers()).toEqual([]);
    });

    it('should return all registered carrier codes', () => {
      service.register(new MockUpsAdapter());
      service.register(new MockFedExAdapter());

      const carriers = service.listCarriers();

      expect(carriers).toHaveLength(2);
      expect(carriers).toContain('ups');
      expect(carriers).toContain('fedex');
    });
  });

  describe('getAllAdapters', () => {
    it('should return all registered adapters', () => {
      const upsAdapter = new MockUpsAdapter();
      const fedexAdapter = new MockFedExAdapter();

      service.register(upsAdapter);
      service.register(fedexAdapter);

      const adapters = service.getAllAdapters();

      expect(adapters).toHaveLength(2);
      expect(adapters).toContain(upsAdapter);
      expect(adapters).toContain(fedexAdapter);
    });

    it('should return empty array when no carriers registered', () => {
      expect(service.getAllAdapters()).toEqual([]);
    });
  });
});
