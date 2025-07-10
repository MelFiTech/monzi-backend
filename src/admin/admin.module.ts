import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ConfigModule } from '@nestjs/config';
import { WalletModule } from '../wallet/wallet.module';
import { BudPayModule } from '../providers/budpay/budpay.module';
import { SmePlugModule } from '../providers/smeplug/smeplug.module';

@Module({
  imports: [
    ConfigModule, 
    WalletModule,
    BudPayModule,
    SmePlugModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {} 