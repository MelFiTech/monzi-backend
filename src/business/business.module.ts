import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';

@Module({
  imports: [ConfigModule],
  controllers: [BusinessController],
  providers: [BusinessService],
  exports: [BusinessService],
})
export class BusinessModule {} 