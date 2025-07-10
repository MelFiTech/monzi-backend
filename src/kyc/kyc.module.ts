import { Module } from '@nestjs/common';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { PrismaService } from '../prisma/prisma.service';
import { WalletModule } from '../wallet/wallet.module';
import { AdminModule } from '../admin/admin.module';
import { ConfigModule } from '@nestjs/config';
import { RavenModule } from '../providers/raven/raven.module';
import { GeminiModule } from '../providers/ai/gemini.module';

@Module({
  imports: [ConfigModule, RavenModule, GeminiModule, WalletModule, AdminModule],
  controllers: [KycController],
  providers: [KycService, PrismaService],
  exports: [KycService],
})
export class KycModule {}
