import { Module } from '@nestjs/common';
import { LocationController } from './location.controller';
import { LocationPublicController } from './location-public.controller';
import { LocationService } from './location.service';
import { LocationTransactionService } from './services/location-transaction.service';
import { LocationPrecisionService } from './services/location-precision.service';
import { LocationTrackingService } from './services/location-tracking.service';
import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationsModule } from '../push-notifications/push-notifications.module';

@Module({
  controllers: [LocationController, LocationPublicController],
  imports: [PushNotificationsModule],
  providers: [
    LocationService,
    LocationTransactionService,
    LocationPrecisionService,
    LocationTrackingService,
    PrismaService,
  ],
  exports: [
    LocationService,
    LocationTransactionService,
    LocationPrecisionService,
    LocationTrackingService,
  ],
})
export class LocationModule {}
