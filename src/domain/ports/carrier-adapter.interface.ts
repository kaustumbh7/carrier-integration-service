import { RateRequest, RateResponse } from '../schemas';

/**
 * Interface that all carrier adapters must implement.
 * This port defines the contract for carrier-specific implementations.
 */
export interface CarrierAdapter {
  /**
   * Unique carrier code (e.g., "ups", "fedex", "usps")
   */
  readonly carrierCode: string;

  /**
   * Get shipping rates for the given request
   * @param request - Rate request with origin, destination, and package details
   * @returns Normalized rate quotes from the carrier
   */
  getRates(request: RateRequest): Promise<RateResponse>;

  /**
   * Future operations to be implemented:
   *
   * createLabel(request: LabelRequest): Promise<LabelResponse>;
   * trackShipment(trackingNumber: string): Promise<TrackingResponse>;
   * validateAddress(address: Address): Promise<AddressValidationResponse>;
   * cancelShipment(shipmentId: string): Promise<void>;
   */
}
