import { z } from 'zod';
import { AddressSchema } from './address.schema';
import { PackageSchema } from './package.schema';

/**
 * Zod schema for rate request
 */
export const RateRequestSchema = z.object({
  /**
   * Shipper/origin address
   */
  origin: AddressSchema,

  /**
   * Destination address
   */
  destination: AddressSchema,

  /**
   * Packages to ship
   */
  packages: z.array(PackageSchema).min(1),

  /**
   * Shipper name (optional)
   */
  shipperName: z.string().trim().optional(),

  /**
   * Carrier account number (required by some carriers like UPS)
   */
  accountNumber: z.string().trim().optional(),

  /**
   * Specific service code to get rate for (optional - if omitted, returns all services)
   * e.g., "03" for UPS Ground
   */
  serviceCode: z.string().trim().optional(),

  /**
   * Pickup date (optional - defaults to current date)
   */
  pickupDate: z.date().optional(),

  /**
   * Whether to request negotiated/account rates (if available)
   */
  requestNegotiatedRates: z.boolean().default(true),
});

/**
 * TypeScript type inferred from Zod schema
 */
export type RateRequest = z.infer<typeof RateRequestSchema>;
