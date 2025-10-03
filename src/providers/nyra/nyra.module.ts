import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NyraWalletProvider } from './nyra-wallet.provider';
import { NyraTransferProvider } from './nyra-transfer.provider';
import { NyraBillProvider } from './nyra-bill.provider';
import { NyraBillService } from './nyra-bill.service';
import { NyraBillController } from './nyra-bill.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthModule } from '../../auth/auth.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { PushNotificationsModule } from '../../push-notifications/push-notifications.module';

@Module({
  imports: [ConfigModule, AuthModule, NotificationsModule, PushNotificationsModule],
  providers: [NyraWalletProvider, NyraTransferProvider, NyraBillProvider, NyraBillService, PrismaService],
  controllers: [NyraBillController],
  exports: [NyraWalletProvider, NyraTransferProvider, NyraBillProvider, NyraBillService],
})
export class NyraModule {}
