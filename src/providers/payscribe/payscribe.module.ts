import { Module } from '@nestjs/common';
import { PayscribeProvider } from './payscribe.provider';
import { PayscribeKycProvider } from './payscribe-kyc.provider';

@Module({
  providers: [PayscribeProvider, PayscribeKycProvider],
  exports: [PayscribeProvider, PayscribeKycProvider],
})
export class PayscribeModule {} 