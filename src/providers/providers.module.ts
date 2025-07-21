import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TransferProviderManagerService } from './transfer-provider-manager.service';
import { ProviderManagerService } from './provider-manager.service';
import { PrismaService } from '../prisma/prisma.service';
import { BudPayModule } from './budpay/budpay.module';
import { SmePlugModule } from './smeplug/smeplug.module';
import { PolarisModule } from './polaris/polaris.module';
import { NyraModule } from './nyra/nyra.module';

@Global()
@Module({
  imports: [ConfigModule, BudPayModule, SmePlugModule, PolarisModule, NyraModule],
  providers: [
    PrismaService,
    TransferProviderManagerService,
    ProviderManagerService,
  ],
  exports: [
    PrismaService,
    TransferProviderManagerService,
    ProviderManagerService,
  ],
})
export class ProvidersModule {}
