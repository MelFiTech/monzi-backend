import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { ConfigModule } from '@nestjs/config';
import { PolarisModule } from '../providers/polaris/polaris.module';
import { SmePlugModule } from '../providers/smeplug/smeplug.module';
import { BudPayModule } from '../providers/budpay/budpay.module';
import { ProvidersModule } from '../providers/providers.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PushNotificationsModule } from '../push-notifications/push-notifications.module';
import { LocationModule } from '../location/location.module';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    PolarisModule,
    SmePlugModule,
    BudPayModule,
    ProvidersModule,
    NotificationsModule,
    PushNotificationsModule,
    LocationModule,
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
