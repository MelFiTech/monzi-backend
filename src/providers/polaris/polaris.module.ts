import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PolarisWalletProvider } from './polaris-wallet.provider';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
    }),
    ConfigModule,
  ],
  providers: [PolarisWalletProvider],
  exports: [PolarisWalletProvider],
})
export class PolarisModule {}
