import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RatingService } from './carrier';
import { RateRequest } from './domain';

/**
 * Main entry point for CLI demonstration
 */
async function bootstrap() {
  console.log('🚀 Carrier Integration Service - CLI Demo\n');

  try {
    // Create NestJS application context (no HTTP server)
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // Get rating service from DI container
    const ratingService = app.get(RatingService);

    // Display available carriers
    const carriers = ratingService.getAvailableCarriers();
    console.log(`✓ Available carriers: ${carriers.join(', ')}\n`);

    // Example rate request
    const demoRequest: RateRequest = {
      origin: {
        addressLines: ['123 Main St'],
        city: 'Atlanta',
        stateProvinceCode: 'GA',
        postalCode: '30301',
        countryCode: 'US',
        isResidential: false,
      },
      destination: {
        addressLines: ['456 Oak Ave'],
        city: 'New York',
        stateProvinceCode: 'NY',
        postalCode: '10001',
        countryCode: 'US',
        isResidential: true,
      },
      packages: [
        {
          weight: {
            value: 5.0,
            unit: 'LB',
          },
          dimensions: {
            length: 10,
            width: 8,
            height: 6,
            unit: 'IN',
          },
          currency: 'USD',
        },
      ],
      shipperName: 'Acme Corp',
      requestNegotiatedRates: true,
    };

    console.log('📦 Rate Request:');
    console.log(`   Origin: ${demoRequest.origin.city}, ${demoRequest.origin.stateProvinceCode}`);
    console.log(
      `   Destination: ${demoRequest.destination.city}, ${demoRequest.destination.stateProvinceCode}`,
    );
    console.log(`   Package: ${demoRequest.packages[0].weight.value} LB\n`);

    // Get rates from UPS
    console.log('⏳ Fetching rates from UPS...\n');

    const response = await ratingService.getRates('ups', demoRequest);

    console.log('✓ Rate Response:');
    console.log(`   Transaction ID: ${response.transactionId || 'N/A'}`);
    console.log(`   Quotes: ${response.quotes.length}\n`);

    // Display each quote
    response.quotes.forEach((quote, index) => {
      console.log(`   ${index + 1}. ${quote.serviceName}`);
      console.log(`      Service Code: ${quote.serviceCode}`);
      console.log(`      Total: ${quote.currency} ${quote.totalCharges.toFixed(2)}`);
      if (quote.negotiatedCharges) {
        console.log(`      Negotiated: ${quote.currency} ${quote.negotiatedCharges.toFixed(2)}`);
      }
      if (quote.transitDays) {
        console.log(`      Transit: ${quote.transitDays} business days`);
      }
      console.log();
    });

    // Display warnings if any
    if (response.warnings && response.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      response.warnings.forEach((warning) => {
        console.log(`   - ${warning}`);
      });
      console.log();
    }

    console.log('✅ Demo completed successfully!');

    // Close the application
    await app.close();
  } catch (error) {
    console.error('\n❌ Error:', error);

    if (error instanceof Error) {
      console.error('Message:', error.message);

      // Display structured error details if available
      if ('toJSON' in error && typeof error.toJSON === 'function') {
        console.error('Details:', JSON.stringify(error.toJSON(), null, 2));
      }
    }

    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  bootstrap();
}
