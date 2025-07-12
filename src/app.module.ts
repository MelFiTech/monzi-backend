import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { KycModule } from './kyc/kyc.module';
import { OcrModule } from './ocr/ocr.module';
import { AiModule } from './ai/ai.module';
import { AccountsModule } from './accounts/accounts.module';
import { WalletModule } from './wallet/wallet.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AdminModule } from './admin/admin.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ProvidersModule } from './providers/providers.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PushNotificationsModule } from './push-notifications/push-notifications.module';
import { EmailModule } from './email/email.module';
import { AuditorModule } from './auditor/auditor.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    KycModule,
    OcrModule,
    AiModule,
    AccountsModule,
    WalletModule,
    TransactionsModule,
    AdminModule,
    WebhooksModule,
    ProvidersModule,
    NotificationsModule,
    PushNotificationsModule,
    EmailModule,
    AuditorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
