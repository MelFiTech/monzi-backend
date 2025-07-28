import { Module } from '@nestjs/common';
import { LocationController } from './location.controller';
import { LocationPublicController } from './location-public.controller';
import { LocationService } from './location.service';
import { LocationTransactionService } from './services/location-transaction.service';
import { LocationPrecisionService } from './services/location-precision.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [LocationController, LocationPublicController],
  providers: [
    LocationService, 
    LocationTransactionService, 
    LocationPrecisionService, 
    PrismaService
  ],
  exports: [LocationService, LocationTransactionService, LocationPrecisionService],
})
export class LocationModule {} 
 
 