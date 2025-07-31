import { Module } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { LocationModule } from '../location/location.module';

@Module({
  imports: [LocationModule],
  providers: [NotificationsGateway, PrismaService],
  exports: [NotificationsGateway],
})
export class NotificationsModule {}
