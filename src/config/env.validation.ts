import { z } from 'zod';

/**
 * Environment variables validation schema
 */
export const EnvSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // UPS Configuration
  UPS_CLIENT_ID: z.string().min(1, 'UPS_CLIENT_ID is required'),
  UPS_CLIENT_SECRET: z.string().min(1, 'UPS_CLIENT_SECRET is required'),
  UPS_ACCOUNT_NUMBER: z.string().min(1, 'UPS_ACCOUNT_NUMBER is required'),
  UPS_BASE_URL: z.string().url().default('https://onlinetools.ups.com'),
  UPS_OAUTH_URL: z.string().url().default('https://onlinetools.ups.com/security/v1/oauth/token'),
  UPS_API_VERSION: z.string().default('v2403'),
  UPS_TRANSACTION_SRC: z.string().default('carrier-integration-service'),
});

export type Environment = z.infer<typeof EnvSchema>;

/**
 * Validate environment variables
 * @param config - Raw config object from process.env
 * @returns Validated and typed environment
 */
export function validateEnv(config: Record<string, unknown>): Environment {
  const result = EnvSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  return result.data;
}
