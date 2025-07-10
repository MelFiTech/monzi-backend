import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { BudPayModule } from '../providers/budpay/budpay.module';
import { SmePlugModule } from '../providers/smeplug/smeplug.module';

@Module({
  imports: [ConfigModule, BudPayModule, SmePlugModule],
  providers: [AccountsService],
  controllers: [AccountsController],
})
export class AccountsModule {}
