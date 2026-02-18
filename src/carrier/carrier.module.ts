import { Module, OnModuleInit } from '@nestjs/common';
import { UpsModule, UpsService } from '@carriers/ups';
import { CarrierRegistryService } from './carrier-registry.service';
import { RatingService } from './rating.service';

/**
 * Carrier Module
 * Imports all carrier modules and provides the registry service
 */
@Module({
  imports: [
    // Import carrier-specific modules
    UpsModule,
    // Future carrier modules:
    // FedExModule,
    // UspsModule,
    // DhlModule,
  ],
  providers: [CarrierRegistryService, RatingService],
  exports: [CarrierRegistryService, RatingService],
})
export class CarrierModule implements OnModuleInit {
  constructor(
    private readonly registry: CarrierRegistryService,
    private readonly upsService: UpsService,
    // Future carrier services to inject:
    // private readonly fedexService: FedExService,
  ) {}

  /**
   * Register all carrier adapters on module initialization
   */
  onModuleInit() {
    // Register UPS adapter
    this.registry.register(this.upsService);

    // Future carriers:
    // this.registry.register(this.fedexService);
    // this.registry.register(this.uspsService);

    console.log(`Registered carriers: ${this.registry.listCarriers().join(', ')}`);
  }
}
