import { Module } from '@nestjs/common';
import { ConfigModule } from './config';
import { CarrierModule } from './carrier';

@Module({
  imports: [ConfigModule, CarrierModule],
})
export class AppModule {}
