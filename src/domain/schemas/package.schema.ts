import { z } from 'zod';

/**
 * Weight units
 */
export const WeightUnitSchema = z.enum(['LB', 'KG']);
export type WeightUnit = z.infer<typeof WeightUnitSchema>;

/**
 * Dimension units
 */
export const DimensionUnitSchema = z.enum(['IN', 'CM']);
export type DimensionUnit = z.infer<typeof DimensionUnitSchema>;

/**
 * Zod schema for package dimensions
 */
export const PackageDimensionsSchema = z.object({
  /**
   * Length
   */
  length: z.number().positive(),

  /**
   * Width
   */
  width: z.number().positive(),

  /**
   * Height
   */
  height: z.number().positive(),

  /**
   * Unit of measurement for dimensions
   */
  unit: DimensionUnitSchema,
});

export type PackageDimensions = z.infer<typeof PackageDimensionsSchema>;

/**
 * Zod schema for package weight
 */
export const PackageWeightSchema = z.object({
  /**
   * Weight value
   */
  value: z.number().positive(),

  /**
   * Unit of measurement for weight
   */
  unit: WeightUnitSchema,
});

export type PackageWeight = z.infer<typeof PackageWeightSchema>;

/**
 * Zod schema for a package/parcel
 */
export const PackageSchema = z.object({
  /**
   * Package weight
   */
  weight: PackageWeightSchema,

  /**
   * Package dimensions (optional - some carriers allow weight-only)
   */
  dimensions: PackageDimensionsSchema.optional(),

  /**
   * Packaging type code (carrier-specific, optional)
   * e.g., "02" for customer-supplied package in UPS
   */
  packagingType: z.string().optional(),

  /**
   * Declared value for insurance (optional)
   */
  declaredValue: z.number().positive().optional(),

  /**
   * Currency code for declared value (ISO 4217)
   */
  currency: z.string().length(3).toUpperCase().default('USD'),
});

/**
 * TypeScript type inferred from Zod schema
 */
export type Package = z.infer<typeof PackageSchema>;
