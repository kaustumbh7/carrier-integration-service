/**
 * UPS-specific type definitions matching the UPS API JSON structure
 * All numeric values are strings per UPS convention
 */

/**
 * UPS OAuth token response
 */
export interface UpsTokenResponse {
  token_type: string;
  issued_at: string;
  client_id: string;
  access_token: string;
  expires_in: string;
  status: string;
}

/**
 * UPS Address structure
 */
export interface UpsAddress {
  AddressLine?: string[];
  City: string;
  StateProvinceCode?: string;
  PostalCode: string;
  CountryCode: string;
}

/**
 * UPS Package dimensions
 */
export interface UpsDimensions {
  UnitOfMeasurement: {
    Code: string; // "IN" or "CM"
    Description?: string;
  };
  Length: string;
  Width: string;
  Height: string;
}

/**
 * UPS Package weight
 */
export interface UpsPackageWeight {
  UnitOfMeasurement: {
    Code: string; // "LBS" or "KG"
    Description?: string;
  };
  Weight: string;
}

/**
 * UPS Package
 */
export interface UpsPackage {
  PackagingType: {
    Code: string;
    Description?: string;
  };
  Dimensions?: UpsDimensions;
  PackageWeight: UpsPackageWeight;
}

/**
 * UPS Service
 */
export interface UpsService {
  Code: string;
  Description?: string;
}

/**
 * UPS Shipper
 */
export interface UpsShipper {
  Name?: string;
  ShipperNumber?: string;
  Address: UpsAddress;
}

/**
 * UPS ShipTo
 */
export interface UpsShipTo {
  Name?: string;
  Address: UpsAddress;
}

/**
 * UPS ShipFrom
 */
export interface UpsShipFrom {
  Name?: string;
  Address: UpsAddress;
}

/**
 * UPS Rate Request
 */
export interface UpsRateRequest {
  RateRequest: {
    Request: {
      SubVersion?: string;
      TransactionReference?: {
        CustomerContext?: string;
      };
    };
    Shipper: UpsShipper;
    ShipTo: UpsShipTo;
    ShipFrom: UpsShipFrom;
    Service?: UpsService;
    Package: UpsPackage[];
    NumOfPieces?: string;
  };
}

/**
 * UPS Charges
 */
export interface UpsCharges {
  CurrencyCode: string;
  MonetaryValue: string;
}

/**
 * UPS Billing Weight
 */
export interface UpsBillingWeight {
  UnitOfMeasurement: {
    Code: string;
    Description?: string;
  };
  Weight: string;
}

/**
 * UPS Rated Package
 */
export interface UpsRatedPackage {
  TransportationCharges: UpsCharges;
  ServiceOptionsCharges?: UpsCharges;
  TotalCharges?: UpsCharges;
  Weight?: string;
  BillingWeight?: UpsBillingWeight;
}

/**
 * UPS Time In Transit
 */
export interface UpsTimeInTransit {
  PickupDate?: string;
  ServiceSummary?: {
    Service?: {
      Description?: string;
    };
    EstimatedArrival?: {
      Arrival?: {
        Date?: string;
        Time?: string;
      };
      BusinessDaysInTransit?: string;
      DayOfWeek?: string;
    };
  };
}

/**
 * UPS Rated Shipment
 */
export interface UpsRatedShipment {
  Service: UpsService;
  RatedShipmentAlert?: Array<{
    Code: string;
    Description: string;
  }>;
  BillingWeight?: UpsBillingWeight;
  TransportationCharges: UpsCharges;
  ServiceOptionsCharges?: UpsCharges;
  TotalCharges: UpsCharges;
  NegotiatedRateCharges?: {
    TotalCharge: UpsCharges;
  };
  GuaranteedDelivery?: {
    BusinessDaysInTransit?: string;
  };
  RatedPackage?: UpsRatedPackage[];
  TimeInTransit?: UpsTimeInTransit;
}

/**
 * UPS Alert
 */
export interface UpsAlert {
  Code: string;
  Description: string;
}

/**
 * UPS Response Status
 */
export interface UpsResponseStatus {
  Code: string;
  Description: string;
}

/**
 * UPS Rate Response
 */
export interface UpsRateResponse {
  RateResponse: {
    Response: {
      ResponseStatus: UpsResponseStatus;
      Alert?: UpsAlert[];
      TransactionReference?: {
        CustomerContext?: string;
      };
    };
    RatedShipment: UpsRatedShipment[];
  };
}

/**
 * UPS Error Response
 */
export interface UpsErrorResponse {
  response: {
    errors: Array<{
      code: string;
      message: string;
    }>;
    alert?: Array<{
      code: string;
      description: string;
    }>;
  };
}
