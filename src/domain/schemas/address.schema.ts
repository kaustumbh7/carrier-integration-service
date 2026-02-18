import { z } from 'zod';

/**
 * Zod schema for shipping address
 */
export const AddressSchema = z.object({
  /**
   * Street address lines (max 3)
   */
  addressLines: z.array(z.string().trim().min(1)).min(1).max(3),

  /**
   * City name
   */
  city: z.string().trim().min(1),

  /**
   * State or province code (e.g., "CA", "NY")
   */
  stateProvinceCode: z.string().trim().min(1).max(10).optional(),

  /**
   * Postal/ZIP code
   */
  postalCode: z.string().trim().min(1),

  /**
   * ISO 3166-1 alpha-2 country code (e.g., "US", "CA")
   */
  countryCode: z.string().length(2).toUpperCase(),

  /**
   * Residential address flag (affects rates for some carriers)
   */
  isResidential: z.boolean().default(false),
});

/**
 * TypeScript type inferred from Zod schema
 */
export type Address = z.infer<typeof AddressSchema>;
