import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { UpsService } from './ups.service';
import { UpsAuthService } from './ups-auth.service';
import upsConfig from './ups.config';

/**
 * UPS Carrier Module
 * Provides UPS-specific carrier adapter implementation
 */
@Module({
  imports: [
    // Register UPS config namespace
    ConfigModule.forFeature(upsConfig),

    // Configure HTTP client for UPS API
    HttpModule.registerAsync({
      imports: [ConfigModule.forFeature(upsConfig)],
      useFactory: (config: ConfigType<typeof upsConfig>) => ({
        timeout: 15000,
        maxRedirects: 5,
        headers: {
          'User-Agent': config.transactionSrc,
        },
      }),
      inject: [upsConfig.KEY],
    }),
  ],
  providers: [UpsService, UpsAuthService],
  exports: [UpsService],
})
export class UpsModule {}
