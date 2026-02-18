# Carrier Integration Service

A production-ready, extensible shipping carrier integration service built with TypeScript and NestJS. Currently supports the **UPS Rating API** with a clean architecture designed to easily support additional carriers (FedEx, USPS, DHL) and operations (label creation, tracking, address validation).

## 🎯 Overview

This service wraps carrier APIs behind a unified, carrier-agnostic interface. Callers never need to know about UPS's (or any carrier's) specific request/response formats — they work with normalized domain models.

### Key Features

- ✅ **Extensible Architecture**: Add new carriers without modifying existing code
- ✅ **Type-Safe**: Strong TypeScript types throughout, with runtime validation via Zod
- ✅ **OAuth 2.0 Token Management**: Automatic token acquisition, caching, and refresh
- ✅ **Comprehensive Error Handling**: Structured errors with retry logic for transient failures
- ✅ **Integration Tested**: Full test coverage with stubbed HTTP responses
- ✅ **Production Ready**: Environment-based configuration, proper separation of concerns

---

## 📐 Architecture

### Design Decisions

**1. Adapter Pattern for Carriers**

Each carrier implements the `CarrierAdapter` interface:

```typescript
interface CarrierAdapter {
  readonly carrierCode: string;
  getRates(request: RateRequest): Promise<RateResponse>;
  // Future: createLabel, trackShipment, validateAddress, etc.
}
```

This allows the system to treat all carriers uniformly while encapsulating carrier-specific logic.

**2. Mapper Layer**

Each carrier has a dedicated mapper (`UpsMapper`, etc.) that converts between:

- **Domain models** (carrier-agnostic) ← used by callers
- **Carrier API models** (UPS-specific) ← used internally

This isolation means carrier API changes only affect the mapper, not the rest of the system.

**3. NestJS for Dependency Injection**

NestJS provides:

- Clean module boundaries (each carrier is its own module)
- Dependency injection for testability
- HTTP client per carrier with isolated configuration
- Lifecycle hooks for registry population

**4. Zod for Validation**

Used for:

- Environment variable validation (fail-fast on startup)
- Request validation (before making external calls)
- Response parsing (defensive against API contract changes)

Single source of truth for types: `z.infer<typeof schema>` generates TypeScript types from schemas.

**5. Token Management with Mutex**

UPS OAuth tokens are cached and refreshed transparently. A mutex pattern prevents concurrent requests from all triggering token refresh simultaneously under load.

---

## 🗂️ Project Structure

```
src/
├── domain/                      # Carrier-agnostic domain layer
│   ├── schemas/                 # Zod schemas + inferred types
│   │   ├── address.schema.ts
│   │   ├── package.schema.ts
│   │   ├── rate-request.schema.ts
│   │   └── rate-response.schema.ts
│   └── ports/
│       └── carrier-adapter.interface.ts
│
├── carriers/                    # Carrier-specific implementations
│   └── ups/
│       ├── ups.module.ts        # NestJS module
│       ├── ups.service.ts       # Implements CarrierAdapter
│       ├── ups-auth.service.ts  # OAuth token management
│       ├── ups.mapper.ts        # Domain ↔ UPS API mapping
│       ├── ups.types.ts         # UPS-specific types
│       ├── ups.constants.ts     # Service codes, endpoints
│       ├── ups.config.ts        # Configuration namespace
│       └── tests/               # Unit & integration tests
│
├── carrier/                     # Orchestration layer
│   ├── carrier.module.ts        # Imports all carrier modules
│   ├── carrier-registry.service.ts  # Registry of adapters
│   └── rating.service.ts        # High-level rating service
│
├── common/                      # Shared utilities
│   ├── errors/                  # Structured error types
│   │   ├── carrier.error.ts
│   │   └── error-mapper.ts
│   └── utils/
│       └── retry.util.ts        # Exponential backoff
│
├── config/                      # Configuration
│   ├── config.module.ts
│   └── env.validation.ts        # Zod-based env validation
│
├── app.module.ts                # Root module
└── main.ts                      # CLI entry point
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your UPS credentials
# (Leave as-is to see error handling in action)
```

### Configuration

Set the following environment variables in `.env`:

```env
# Required UPS credentials
UPS_CLIENT_ID=your_client_id_here
UPS_CLIENT_SECRET=your_client_secret_here
UPS_ACCOUNT_NUMBER=your_account_number

# API endpoints (defaults to production, use sandbox for testing)
UPS_BASE_URL=https://onlinetools.ups.com
UPS_OAUTH_URL=https://onlinetools.ups.com/security/v1/oauth/token
UPS_API_VERSION=v2403
UPS_TRANSACTION_SRC=carrier-integration-service
```

### Running the Service

```bash
# Build the project
npm run build

# Run the CLI demo
npm run start:cli

# Development mode (with watch)
npm run start:dev
```

The CLI demo will:

1. Bootstrap the NestJS application context
2. Display available carriers
3. Make a sample rate request to UPS
4. Display normalized rate quotes

**Note**: Without valid UPS credentials, you'll see a `CarrierAuthError`. This demonstrates the structured error handling.

---

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov
```

### Test Coverage

The test suite includes:

**1. UPS Auth Service** (`ups-auth.service.spec.ts`)

- Token acquisition
- Token caching and reuse
- Token expiry and refresh
- Concurrent request handling (mutex)
- Error handling (401, network errors)

**2. UPS Mapper** (`ups.mapper.spec.ts`)

- Domain → UPS request mapping
- UPS response → Domain mapping
- Multi-package handling
- Service code resolution
- Warning extraction

**3. UPS Service** (`ups.service.spec.ts`)

- End-to-end rate request flow
- Request validation
- HTTP error handling (400, 401, 429, 503, timeout)
- Response parsing errors
- Auth token invalidation and retry on 401

**4. Carrier Registry** (`carrier-registry.service.spec.ts`)

- Adapter registration
- Adapter resolution
- Case-insensitive lookup
- Error messages for unknown carriers

All tests use **stubbed HTTP responses** based on real UPS API payloads — no live API calls required.

---

## 📚 Usage Examples

### Get Rates from UPS

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RatingService } from './carrier';
import { RateRequest } from './domain';

const app = await NestFactory.createApplicationContext(AppModule);
const ratingService = app.get(RatingService);

const request: RateRequest = {
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
      weight: { value: 5.0, unit: 'LB' },
      dimensions: { length: 10, width: 8, height: 6, unit: 'IN' },
    },
  ],
};

// Get rates from UPS
const response = await ratingService.getRates('ups', request);

response.quotes.forEach((quote) => {
  console.log(`${quote.serviceName}: ${quote.currency} ${quote.totalCharges}`);
  if (quote.negotiatedCharges) {
    console.log(`  Negotiated: ${quote.currency} ${quote.negotiatedCharges}`);
  }
});
```

### Shop All Carriers (Future)

```typescript
// When multiple carriers are registered
const allRates = await ratingService.shopAllCarriers(request);

for (const [carrier, response] of Object.entries(allRates)) {
  console.log(`\n${carrier.toUpperCase()}:`);
  response.quotes.forEach((quote) => {
    console.log(`  ${quote.serviceName}: ${quote.totalCharges}`);
  });
}
```

---

## 🔧 Adding a New Carrier

To add FedEx (or any carrier):

### 1. Create Carrier Module

```
src/carriers/fedex/
├── fedex.module.ts
├── fedex.service.ts          # implements CarrierAdapter
├── fedex-auth.service.ts     # if needed
├── fedex.mapper.ts
├── fedex.types.ts
├── fedex.constants.ts
├── fedex.config.ts
└── tests/
```

### 2. Implement CarrierAdapter

```typescript
@Injectable()
export class FedExService implements CarrierAdapter {
  readonly carrierCode = 'fedex';

  async getRates(request: RateRequest): Promise<RateResponse> {
    // 1. Validate request
    // 2. Map to FedEx API structure
    // 3. Make API call
    // 4. Parse and map response
    // 5. Return normalized RateResponse
  }
}
```

### 3. Register in CarrierModule

```typescript
// src/carrier/carrier.module.ts
@Module({
  imports: [UpsModule, FedExModule],
  // ...
})
export class CarrierModule implements OnModuleInit {
  constructor(
    private readonly registry: CarrierRegistryService,
    private readonly upsService: UpsService,
    private readonly fedexService: FedExService,
  ) {}

  onModuleInit() {
    this.registry.register(this.upsService);
    this.registry.register(this.fedexService);
  }
}
```

**That's it!** The existing caller code continues to work — it just has access to a new carrier code.

---

## 🚧 Future Improvements

Given more time, I would add:

### 1. Additional Carriers

- **FedEx** (very similar to UPS)
- **USPS** (different auth pattern)
- **DHL** (international focus)

### 2. Additional Operations

- **Label Creation**: `createLabel(request: LabelRequest): Promise<LabelResponse>`
- **Tracking**: `trackShipment(trackingNumber: string): Promise<TrackingResponse>`
- **Address Validation**: `validateAddress(address: Address): Promise<ValidationResult>`
- **Shipment Cancellation**: `cancelShipment(shipmentId: string): Promise<void>`

### 3. Production Enhancements

- **Database Caching**: Cache rate quotes for identical requests (Redis)
- **Circuit Breaker**: Stop calling carriers that are repeatedly failing
- **Rate Limiting Middleware**: Enforce per-carrier rate limits
- **OpenTelemetry**: Distributed tracing across carrier calls
- **Metrics**: Prometheus metrics for success/failure rates, latency percentiles
- **Webhook Support**: For tracking updates
- **Batch Operations**: Submit multiple rate requests at once

### 4. Developer Experience

- **OpenAPI/Swagger**: Auto-generated API docs if we expose REST endpoints
- **CLI Tool**: Robust CLI with commands like `carrier-cli rate --from=GA --to=NY --weight=5`
- **Docker**: Containerized deployment
- **Helm Chart**: Kubernetes deployment

### 5. Advanced Error Handling

- **Retry with backoff per error type**: Different strategies for network errors vs. rate limits
- **Dead Letter Queue**: For failed requests that need manual intervention
- **Error Aggregation**: Sentry/LogRocket integration
- **Graceful Degradation**: If UPS is down, fallback to FedEx automatically

---

## 🛠️ Technology Stack

| Category        | Technology                  | Justification                                                |
| --------------- | --------------------------- | ------------------------------------------------------------ |
| **Language**    | TypeScript                  | Type safety, excellent DX, required by assessment            |
| **Framework**   | NestJS                      | Clean DI, module system, production-proven for microservices |
| **Validation**  | Zod                         | Runtime + compile-time type safety from single source        |
| **HTTP Client** | Axios (via `@nestjs/axios`) | Robust, interceptors, good error handling                    |
| **Testing**     | Vitest                      | Fast (Vite-based), compatible with NestJS via `unplugin-swc` |
| **Config**      | `@nestjs/config`            | Environment-based config with type safety                    |

---

## 📄 API Documentation

### Domain Types

**Address**

```typescript
{
  addressLines: string[];          // 1-3 lines
  city: string;
  stateProvinceCode?: string;
  postalCode: string;
  countryCode: string;             // ISO 3166-1 alpha-2
  isResidential: boolean;
}
```

**Package**

```typescript
{
  weight: {
    value: number;
    unit: 'LB' | 'KG';
  };
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'IN' | 'CM';
  };
  packagingType?: string;
  declaredValue?: number;
  currency?: string;                // ISO 4217
}
```

**RateRequest**

```typescript
{
  origin: Address;
  destination: Address;
  packages: Package[];
  shipperName?: string;
  accountNumber?: string;
  serviceCode?: string;             // If omitted, returns all services
  pickupDate?: Date;
  requestNegotiatedRates?: boolean;
}
```

**RateResponse**

```typescript
{
  quotes: RateQuote[];
  warnings?: string[];
  transactionId?: string;
}
```

**RateQuote**

```typescript
{
  carrier: string;
  serviceCode: string;
  serviceName: string;
  totalCharges: number;
  currency: string;
  baseCharges?: number;
  serviceCharges?: number;
  negotiatedCharges?: number;
  billingWeight?: { value: number; unit: 'LB' | 'KG' };
  transitDays?: number;
  guaranteedDelivery?: boolean;
  estimatedDeliveryDate?: string;
  metadata?: Record<string, unknown>;
}
```

---

## ⚠️ Error Handling

All errors extend `CarrierError`:

| Error Type                  | HTTP Status | Retryable | Common Causes                       |
| --------------------------- | ----------- | --------- | ----------------------------------- |
| `CarrierAuthError`          | 401, 403    | ❌        | Invalid credentials, token expired  |
| `CarrierValidationError`    | 400, 422    | ❌        | Invalid postal code, missing fields |
| `CarrierRateLimitError`     | 429         | ✅        | Too many requests                   |
| `CarrierNetworkError`       | N/A         | ✅        | Timeout, connection refused         |
| `CarrierServiceError`       | 500-599     | ✅        | Carrier server error                |
| `CarrierResponseParseError` | N/A         | ❌        | Unexpected response shape           |

Errors include structured details:

```typescript
try {
  await ratingService.getRates('ups', request);
} catch (error) {
  if (error instanceof CarrierError) {
    console.log(error.carrierCode); // "ups"
    console.log(error.errorCode); // "111100"
    console.log(error.isRetryable); // false
    console.log(error.httpStatus); // 400
    console.log(error.details); // { ... }
  }
}
```

---

## 📝 License

MIT

---

## 👤 Author

Built for Cybership as a take-home assessment demonstrating production-quality TypeScript architecture.

---

## 🙏 Acknowledgments

- UPS Developer API Documentation: https://developer.ups.com/tag/Rating
- NestJS Documentation: https://docs.nestjs.com
- Zod Documentation: https://zod.dev
