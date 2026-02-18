import { Injectable } from '@nestjs/common';
import { RateRequest, RateResponse } from '@domain/schemas';
import { CarrierRegistryService } from './carrier-registry.service';

/**
 * Rating Service
 * High-level orchestration service for getting shipping rates
 */
@Injectable()
export class RatingService {
  constructor(private readonly registry: CarrierRegistryService) {}

  /**
   * Get rates from a specific carrier
   * @param carrierCode - Carrier code (e.g., "ups")
   * @param request - Rate request
   * @returns Rate response with quotes
   */
  async getRates(carrierCode: string, request: RateRequest): Promise<RateResponse> {
    const adapter = this.registry.resolve(carrierCode);
    return adapter.getRates(request);
  }

  /**
   * Get rates from all available carriers
   * @param request - Rate request
   * @returns Record of carrier code to rate response
   */
  async shopAllCarriers(request: RateRequest): Promise<Record<string, RateResponse>> {
    const adapters = this.registry.getAllAdapters();
    const results: Record<string, RateResponse> = {};

    // Execute all requests in parallel
    const promises = adapters.map(async (adapter) => {
      try {
        const response = await adapter.getRates(request);
        results[adapter.carrierCode] = response;
      } catch (error) {
        // Log error but don't fail the entire operation
        console.error(`Failed to get rates from ${adapter.carrierCode}:`, error);
      }
    });

    await Promise.all(promises);

    return results;
  }

  /**
   * List all available carriers
   * @returns Array of carrier codes
   */
  getAvailableCarriers(): string[] {
    return this.registry.listCarriers();
  }
}
