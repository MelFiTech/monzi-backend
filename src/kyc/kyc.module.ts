import { Module } from '@nestjs/common';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { AdminService } from '../admin/admin.service';
import { ConfigModule } from '@nestjs/config';
import { RavenModule } from '../providers/raven/raven.module';
import { GeminiModule } from '../providers/ai/gemini.module';

@Module({
  imports: [ConfigModule, RavenModule, GeminiModule],
  controllers: [KycController],
  providers: [KycService, PrismaService, WalletService, AdminService],
  exports: [KycService],
})
export class KycModule {} 