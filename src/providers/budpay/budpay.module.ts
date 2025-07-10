import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { BudPayWalletProvider } from './budpay-wallet.provider';
import { BudPayTransferProvider } from './budpay-transfer.provider';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [BudPayWalletProvider, BudPayTransferProvider],
  exports: [BudPayWalletProvider, BudPayTransferProvider],
})
export class BudPayModule {} 