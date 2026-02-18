import { RateRequest, RateResponse, RateQuote } from '@domain/schemas';
import {
  UpsRateRequest,
  UpsRateResponse,
  UpsAddress,
  UpsPackage,
  UpsRatedShipment,
} from './ups.types';
import {
  UPS_SERVICE_CODES,
  DEFAULT_PACKAGING_CODE,
  WEIGHT_UNIT_MAP,
  DIMENSION_UNIT_MAP,
} from './ups.constants';
import { UpsConfig } from './ups.config';

/**
 * UPS Mapper - converts between domain models and UPS API structures
 */
export class UpsMapper {
  /**
   * Map domain RateRequest to UPS API request structure
   */
  static toUpsRateRequest(request: RateRequest, config: UpsConfig): UpsRateRequest {
    const packages: UpsPackage[] = request.packages.map((pkg) => {
      const upsPackage: UpsPackage = {
        PackagingType: {
          Code: pkg.packagingType || DEFAULT_PACKAGING_CODE,
          Description: pkg.packagingType ? undefined : 'Customer Supplied Package',
        },
        PackageWeight: {
          UnitOfMeasurement: {
            Code: WEIGHT_UNIT_MAP[pkg.weight.unit] || pkg.weight.unit,
            Description: pkg.weight.unit === 'LB' ? 'Pounds' : 'Kilograms',
          },
          Weight: pkg.weight.value.toFixed(1),
        },
      };

      // Add dimensions if provided
      if (pkg.dimensions) {
        upsPackage.Dimensions = {
          UnitOfMeasurement: {
            Code: DIMENSION_UNIT_MAP[pkg.dimensions.unit] || pkg.dimensions.unit,
            Description: pkg.dimensions.unit === 'IN' ? 'Inches' : 'Centimeters',
          },
          Length: pkg.dimensions.length.toFixed(1),
          Width: pkg.dimensions.width.toFixed(1),
          Height: pkg.dimensions.height.toFixed(1),
        };
      }

      return upsPackage;
    });

    const upsRequest: UpsRateRequest = {
      RateRequest: {
        Request: {
          SubVersion: config.apiVersion.replace('v', ''),
          TransactionReference: {
            CustomerContext: 'Rating',
          },
        },
        Shipper: {
          Name: request.shipperName,
          ShipperNumber: request.accountNumber || config.accountNumber,
          Address: this.toUpsAddress(request.origin),
        },
        ShipTo: {
          Name: undefined,
          Address: this.toUpsAddress(request.destination),
        },
        ShipFrom: {
          Name: request.shipperName,
          Address: this.toUpsAddress(request.origin),
        },
        Package: packages,
        NumOfPieces: packages.length.toString(),
      },
    };

    // Add service code if specific service requested
    if (request.serviceCode) {
      upsRequest.RateRequest.Service = {
        Code: request.serviceCode,
        Description: UPS_SERVICE_CODES[request.serviceCode],
      };
    }

    return upsRequest;
  }

  /**
   * Map UPS API response to domain RateResponse
   */
  static fromUpsRateResponse(upsResponse: UpsRateResponse, transactionId?: string): RateResponse {
    const quotes: RateQuote[] = upsResponse.RateResponse.RatedShipment.map((ratedShipment) =>
      this.toRateQuote(ratedShipment),
    );

    // Extract warnings from alerts
    const warnings = upsResponse.RateResponse.Response.Alert?.map((alert) => alert.Description);

    return {
      quotes,
      warnings,
      transactionId,
    };
  }

  /**
   * Convert domain Address to UPS Address
   */
  private static toUpsAddress(address: {
    addressLines: string[];
    city: string;
    stateProvinceCode?: string;
    postalCode: string;
    countryCode: string;
  }): UpsAddress {
    return {
      AddressLine: address.addressLines.slice(0, 3), // UPS max 3 lines
      City: address.city,
      StateProvinceCode: address.stateProvinceCode,
      PostalCode: address.postalCode,
      CountryCode: address.countryCode,
    };
  }

  /**
   * Convert UPS RatedShipment to domain RateQuote
   */
  private static toRateQuote(ratedShipment: UpsRatedShipment): RateQuote {
    const serviceCode = ratedShipment.Service.Code;
    const serviceName =
      UPS_SERVICE_CODES[serviceCode] || ratedShipment.Service.Description || serviceCode;

    // Parse charges (UPS returns strings)
    const totalCharges = parseFloat(ratedShipment.TotalCharges.MonetaryValue);
    const baseCharges = parseFloat(ratedShipment.TransportationCharges.MonetaryValue);
    const serviceCharges = ratedShipment.ServiceOptionsCharges
      ? parseFloat(ratedShipment.ServiceOptionsCharges.MonetaryValue)
      : undefined;

    // Get negotiated rate if available
    const negotiatedCharges = ratedShipment.NegotiatedRateCharges
      ? parseFloat(ratedShipment.NegotiatedRateCharges.TotalCharge.MonetaryValue)
      : undefined;

    const quote: RateQuote = {
      carrier: 'ups',
      serviceCode,
      serviceName,
      totalCharges,
      currency: ratedShipment.TotalCharges.CurrencyCode,
      baseCharges,
      serviceCharges,
      negotiatedCharges,
    };

    // Add billing weight if available
    if (ratedShipment.BillingWeight) {
      quote.billingWeight = {
        value: parseFloat(ratedShipment.BillingWeight.Weight),
        unit: ratedShipment.BillingWeight.UnitOfMeasurement.Code === 'LBS' ? 'LB' : 'KG',
      };
    }

    // Add transit days if available
    if (ratedShipment.GuaranteedDelivery?.BusinessDaysInTransit) {
      quote.transitDays = parseInt(ratedShipment.GuaranteedDelivery.BusinessDaysInTransit, 10);
      quote.guaranteedDelivery = true;
    }

    // Add estimated delivery date from TimeInTransit if available
    if (ratedShipment.TimeInTransit?.ServiceSummary?.EstimatedArrival?.Arrival?.Date) {
      quote.estimatedDeliveryDate =
        ratedShipment.TimeInTransit.ServiceSummary.EstimatedArrival.Arrival.Date;

      if (ratedShipment.TimeInTransit.ServiceSummary.EstimatedArrival.BusinessDaysInTransit) {
        quote.transitDays = parseInt(
          ratedShipment.TimeInTransit.ServiceSummary.EstimatedArrival.BusinessDaysInTransit,
          10,
        );
      }
    }

    return quote;
  }
}
