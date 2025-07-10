import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationsService } from './push-notifications.service';
import { PushNotificationsController } from './push-notifications.controller';

@Module({
  imports: [ConfigModule],
  controllers: [PushNotificationsController],
  providers: [PushNotificationsService, PrismaService],
  exports: [PushNotificationsService],
})
export class PushNotificationsModule {}
