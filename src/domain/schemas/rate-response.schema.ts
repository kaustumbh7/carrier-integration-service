import { z } from 'zod';

/**
 * Zod schema for individual rate quote
 */
export const RateQuoteSchema = z.object({
  /**
   * Carrier code (e.g., "ups", "fedex")
   */
  carrier: z.string(),

  /**
   * Carrier-specific service code (e.g., "03" for UPS Ground)
   */
  serviceCode: z.string(),

  /**
   * Human-readable service name
   */
  serviceName: z.string(),

  /**
   * Total charges (list/published rate)
   */
  totalCharges: z.number().nonnegative(),

  /**
   * Currency code (ISO 4217)
   */
  currency: z.string().length(3).toUpperCase(),

  /**
   * Base transportation charges
   */
  baseCharges: z.number().nonnegative().optional(),

  /**
   * Additional service option charges
   */
  serviceCharges: z.number().nonnegative().optional(),

  /**
   * Negotiated/account rate (if available and requested)
   */
  negotiatedCharges: z.number().nonnegative().optional(),

  /**
   * Billing weight used for calculation
   */
  billingWeight: z
    .object({
      value: z.number().positive(),
      unit: z.enum(['LB', 'KG']),
    })
    .optional(),

  /**
   * Estimated transit days
   */
  transitDays: z.number().int().positive().optional(),

  /**
   * Guaranteed delivery indicator
   */
  guaranteedDelivery: z.boolean().optional(),

  /**
   * Estimated delivery date
   */
  estimatedDeliveryDate: z.string().optional(),

  /**
   * Additional metadata from carrier
   */
  metadata: z.record(z.unknown()).optional(),
});

export type RateQuote = z.infer<typeof RateQuoteSchema>;

/**
 * Zod schema for rate response
 */
export const RateResponseSchema = z.object({
  /**
   * Array of rate quotes
   */
  quotes: z.array(RateQuoteSchema),

  /**
   * Non-fatal warnings from carrier
   */
  warnings: z.array(z.string()).optional(),

  /**
   * Request correlation ID
   */
  transactionId: z.string().optional(),
});

/**
 * TypeScript type inferred from Zod schema
 */
export type RateResponse = z.infer<typeof RateResponseSchema>;
