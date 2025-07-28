import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { KycManagementService } from './services/kyc-management.service';
import { UserManagementService } from './services/user-management.service';
import { TransactionManagementService } from './services/transaction-management.service';
import { AdminManagementService } from './services/admin-management.service';
import { WalletManagementService } from './services/wallet-management.service';
import { PrismaService } from '../prisma/prisma.service';
import { WalletModule } from '../wallet/wallet.module';
import { ProvidersModule } from '../providers/providers.module';
import { PushNotificationsModule } from '../push-notifications/push-notifications.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    WalletModule,
    ProvidersModule,
    PushNotificationsModule,
    EmailModule,
    NotificationsModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    KycManagementService,
    UserManagementService,
    TransactionManagementService,
    AdminManagementService,
    WalletManagementService,
    PrismaService,
  ],
  exports: [AdminService],
})
export class AdminModule {}
