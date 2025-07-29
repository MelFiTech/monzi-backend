import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { EmailImagesService } from './email-images.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [ConfigModule, CloudinaryModule],
  providers: [EmailService, EmailImagesService],
  controllers: [EmailController],
  exports: [EmailService, EmailImagesService],
})
export class EmailModule {}
