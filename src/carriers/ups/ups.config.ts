import { registerAs } from '@nestjs/config';

export interface UpsConfig {
  clientId?: string;
  clientSecret?: string;
  accountNumber?: string;
  baseUrl: string;
  oauthUrl: string;
  apiVersion: string;
  transactionSrc: string;
  mockMode: boolean;
}

/**
 * UPS configuration namespace
 */
export default registerAs('ups', (): UpsConfig => {
  const clientId = process.env.UPS_CLIENT_ID;
  const clientSecret = process.env.UPS_CLIENT_SECRET;
  const accountNumber = process.env.UPS_ACCOUNT_NUMBER;
  const mockModeEnv = process.env.UPS_MOCK_MODE === 'true';

  // Enable mock mode if explicitly set OR if any credentials are missing
  const mockMode = mockModeEnv || !clientId || !clientSecret || !accountNumber;

  const config: UpsConfig = {
    clientId,
    clientSecret,
    accountNumber,
    baseUrl: process.env.UPS_BASE_URL || 'https://onlinetools.ups.com',
    oauthUrl: process.env.UPS_OAUTH_URL || 'https://onlinetools.ups.com/security/v1/oauth/token',
    apiVersion: process.env.UPS_API_VERSION || 'v2403',
    transactionSrc: process.env.UPS_TRANSACTION_SRC || 'carrier-integration-service',
    mockMode,
  };

  return config;
});
