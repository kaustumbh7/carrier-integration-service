/**
 * UPS service codes and human-readable names
 */
export const UPS_SERVICE_CODES: Record<string, string> = {
  // Domestic US services
  '01': 'UPS Next Day Air',
  '02': 'UPS 2nd Day Air',
  '03': 'UPS Ground',
  '12': 'UPS 3 Day Select',
  '13': 'UPS Next Day Air Saver',
  '14': 'UPS Next Day Air Early',
  '59': 'UPS 2nd Day Air A.M.',

  // International services
  '07': 'UPS Worldwide Express',
  '08': 'UPS Worldwide Expedited',
  '11': 'UPS Standard',
  '54': 'UPS Worldwide Express Plus',
  '65': 'UPS Worldwide Saver',
  '96': 'UPS Worldwide Express Freight',

  // SurePost
  '92': 'UPS SurePost - Less than 1 lb',
  '93': 'UPS SurePost - 1 lb or Greater',
  '94': 'UPS SurePost - BPM',
  '95': 'UPS SurePost - Media Mail',
};

/**
 * UPS packaging type codes
 */
export const UPS_PACKAGING_CODES: Record<string, string> = {
  '00': 'Unknown',
  '01': 'UPS Letter',
  '02': 'Customer Supplied Package',
  '03': 'Tube',
  '04': 'PAK',
  '21': 'UPS Express Box',
  '24': 'UPS 25KG Box',
  '25': 'UPS 10KG Box',
  '30': 'Pallet',
};

/**
 * Default packaging type (customer supplied)
 */
export const DEFAULT_PACKAGING_CODE = '02';

/**
 * Weight unit mapping
 */
export const WEIGHT_UNIT_MAP: Record<string, string> = {
  LB: 'LBS',
  KG: 'KG',
};

/**
 * Dimension unit mapping
 */
export const DIMENSION_UNIT_MAP: Record<string, string> = {
  IN: 'IN',
  CM: 'CM',
};

/**
 * UPS API endpoints
 */
export const UPS_ENDPOINTS = {
  RATE: '/api/rating/{version}/Rate',
  SHOP: '/api/rating/{version}/Shop',
  RATE_TIME_IN_TRANSIT: '/api/rating/{version}/Ratetimeintransit',
  SHOP_TIME_IN_TRANSIT: '/api/rating/{version}/Shoptimeintransit',
} as const;

/**
 * Request option types for UPS rating API
 */
export type UpsRequestOption = 'Rate' | 'Shop' | 'Ratetimeintransit' | 'Shoptimeintransit';

/**
 * Default request option (shop all services)
 */
export const DEFAULT_REQUEST_OPTION: UpsRequestOption = 'Shop';
