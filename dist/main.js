"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors();
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
    }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('SnapNGo Backend API')
        .setDescription(`
    🚀 **SnapNGo Backend** - AI-Powered Financial Transaction API

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
    `)
        .setVersion('1.0')
        .addBearerAuth()
        .addTag('Authentication', 'User registration, login, and PIN verification')
        .addTag('OCR', 'Image processing and text extraction')
        .addTag('AI Assistant', 'Natural language transaction queries')
        .addTag('Transactions', 'Money transfers and transaction history')
        .addTag('Accounts', 'Bank account resolution and verification')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api', app, document, {
        customSiteTitle: 'SnapNGo API Documentation',
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
    console.log(`🚀 SnapNGo Backend running on: http://localhost:${port}`);
    console.log(`📚 API Documentation: http://localhost:${port}/api`);
}
bootstrap();
//# sourceMappingURL=main.js.map