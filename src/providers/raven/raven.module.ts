import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RavenKycProvider } from './raven-kyc.provider';

@Module({
  imports: [ConfigModule],
  providers: [RavenKycProvider],
  exports: [RavenKycProvider],
})
export class RavenModule {}
