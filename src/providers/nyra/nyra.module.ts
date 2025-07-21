import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NyraWalletProvider } from './nyra-wallet.provider';
import { NyraTransferProvider } from './nyra-transfer.provider';

@Module({
  imports: [ConfigModule],
  providers: [NyraWalletProvider, NyraTransferProvider],
  exports: [NyraWalletProvider, NyraTransferProvider],
})
export class NyraModule {} 