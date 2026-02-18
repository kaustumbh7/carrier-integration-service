import { Injectable } from '@nestjs/common';
import { CarrierAdapter } from '@domain/ports';

/**
 * Carrier Registry Service
 * Maintains a registry of all available carrier adapters
 */
@Injectable()
export class CarrierRegistryService {
  private readonly adapters = new Map<string, CarrierAdapter>();

  /**
   * Register a carrier adapter
   * @param adapter - Carrier adapter implementation
   */
  register(adapter: CarrierAdapter): void {
    this.adapters.set(adapter.carrierCode, adapter);
  }

  /**
   * Resolve a carrier adapter by code
   * @param carrierCode - Carrier code (e.g., "ups", "fedex")
   * @returns Carrier adapter
   * @throws Error if carrier not found
   */
  resolve(carrierCode: string): CarrierAdapter {
    const adapter = this.adapters.get(carrierCode.toLowerCase());
    if (!adapter) {
      throw new Error(
        `Carrier "${carrierCode}" not found. Available carriers: ${this.listCarriers().join(', ')}`,
      );
    }
    return adapter;
  }

  /**
   * Check if a carrier is registered
   * @param carrierCode - Carrier code
   * @returns True if carrier is registered
   */
  has(carrierCode: string): boolean {
    return this.adapters.has(carrierCode.toLowerCase());
  }

  /**
   * List all registered carrier codes
   * @returns Array of carrier codes
   */
  listCarriers(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Get all registered adapters
   * @returns Array of carrier adapters
   */
  getAllAdapters(): CarrierAdapter[] {
    return Array.from(this.adapters.values());
  }
}
