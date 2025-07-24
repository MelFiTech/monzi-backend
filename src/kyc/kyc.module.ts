import { Module } from '@nestjs/common';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { PrismaService } from '../prisma/prisma.service';
import { WalletModule } from '../wallet/wallet.module';
import { AdminModule } from '../admin/admin.module';
import { ConfigModule } from '@nestjs/config';
import { RavenModule } from '../providers/raven/raven.module';
import { GeminiModule } from '../providers/ai/gemini.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { IdentityPassModule } from '../providers/identity-pass/identity-pass.module';
import { PayscribeModule } from '../providers/payscribe/payscribe.module';

@Module({
  imports: [
    ConfigModule,
    RavenModule,
    GeminiModule,
    WalletModule,
    AdminModule,
    CloudinaryModule,
    IdentityPassModule,
    PayscribeModule,
  ],
  controllers: [KycController],
  providers: [KycService, PrismaService],
  exports: [KycService],
})
export class KycModule {}
