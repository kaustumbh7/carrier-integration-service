import { registerAs } from '@nestjs/config';

export interface UpsConfig {
  clientId: string;
  clientSecret: string;
  accountNumber: string;
  baseUrl: string;
  oauthUrl: string;
  apiVersion: string;
  transactionSrc: string;
}

/**
 * UPS configuration namespace
 */
export default registerAs('ups', (): UpsConfig => {
  const config: UpsConfig = {
    clientId: process.env.UPS_CLIENT_ID || '',
    clientSecret: process.env.UPS_CLIENT_SECRET || '',
    accountNumber: process.env.UPS_ACCOUNT_NUMBER || '',
    baseUrl: process.env.UPS_BASE_URL || 'https://onlinetools.ups.com',
    oauthUrl: process.env.UPS_OAUTH_URL || 'https://onlinetools.ups.com/security/v1/oauth/token',
    apiVersion: process.env.UPS_API_VERSION || 'v2403',
    transactionSrc: process.env.UPS_TRANSACTION_SRC || 'carrier-integration-service',
  };

  // Validate required fields
  if (!config.clientId) {
    throw new Error('UPS_CLIENT_ID is required');
  }
  if (!config.clientSecret) {
    throw new Error('UPS_CLIENT_SECRET is required');
  }
  if (!config.accountNumber) {
    throw new Error('UPS_ACCOUNT_NUMBER is required');
  }

  return config;
});
