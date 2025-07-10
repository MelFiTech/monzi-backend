import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SmePlugWalletProvider } from './smeplug-wallet.provider';
import { SmePlugTransferProvider } from './smeplug-transfer.provider';

@Module({
  imports: [ConfigModule],
  providers: [SmePlugWalletProvider, SmePlugTransferProvider],
  exports: [SmePlugWalletProvider, SmePlugTransferProvider],
})
export class SmePlugModule {} 