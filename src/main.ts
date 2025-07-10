import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Monzi Backend API')
    .setDescription(
      `
🚀 **Monzi Backend** - AI-Powered Financial Transaction API

    ## Features
    - 🔐 **Authentication**: PIN & Biometric authentication
    - 📸 **OCR Processing**: Extract transaction data from images
    - 🤖 **AI Assistant**: Natural language transaction queries
    - 💳 **Transactions**: Send money and track history
    - 🏦 **Account Resolution**: Verify bank account details
    
    ## AI Prompt Examples
    - "Show my last 3 GTBank transfers"
    - "Find payments over 10,000 to John"
    - "Total spent this month"
    
    ## Getting Started
    1. Register a new account with \`/auth/register\`
    2. Login with \`/auth/login\` to get your access token
    3. Use the token in the "Authorize" button above
    4. Try OCR with \`/ocr/extract\` or AI queries with \`/ai/query\`
    `,
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'User registration, login, and PIN verification')
    .addTag('OCR', 'Image processing and text extraction')
    .addTag('AI Assistant', 'Natural language transaction queries')
    .addTag('Transactions', 'Money transfers and transaction history')
    .addTag('Accounts', 'Bank account resolution and verification')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'Monzi API Documentation',
    customfavIcon: 'https://nestjs.com/img/logo_text.svg',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    ],
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Monzi Backend running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api`);
}

bootstrap();
