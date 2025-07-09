import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiAiProvider } from './gemini.provider';

@Module({
  imports: [ConfigModule],
  providers: [GeminiAiProvider],
  exports: [GeminiAiProvider],
})
export class GeminiModule {} 