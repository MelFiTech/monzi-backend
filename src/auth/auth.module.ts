import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRegistrationService } from './services/auth-registration.service';
import { AuthProfileService } from './services/auth-profile.service';
import { AuthSecurityService } from './services/auth-security.service';
import { AuthNotificationsService } from './services/auth-notifications.service';
import { AuthTransactionReportsService } from './services/auth-transaction-reports.service';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PushNotificationsModule } from '../push-notifications/push-notifications.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION', '7d'),
        },
      }),
    }),
    EmailModule,
    NotificationsModule,
    PushNotificationsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRegistrationService,
    AuthProfileService,
    AuthSecurityService,
    AuthNotificationsService,
    AuthTransactionReportsService,
    JwtStrategy,
    PrismaService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
