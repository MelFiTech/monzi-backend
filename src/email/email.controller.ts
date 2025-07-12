import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  Get,
  Param,
  Put,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { EmailService } from './email.service';
import {
  SendOtpEmailDto,
  SendWelcomeEmailDto,
  SendTransactionEmailDto,
  SendPromotionalEmailDto,
  BulkEmailDto,
  EmailSendResponse,
  EmailType,
} from './dto/email.dto';

@ApiTags('email')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send-otp')
  @ApiOperation({ summary: 'Send OTP email' })
  @ApiResponse({
    status: 200,
    description: 'OTP email sent successfully',
    type: EmailSendResponse,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @HttpCode(HttpStatus.OK)
  async sendOtpEmail(
    @Body(ValidationPipe) dto: SendOtpEmailDto,
  ): Promise<EmailSendResponse> {
    return await this.emailService.sendOtpEmail(dto);
  }

  @Post('send-welcome')
  @ApiOperation({ summary: 'Send welcome email' })
  @ApiResponse({
    status: 200,
    description: 'Welcome email sent successfully',
    type: EmailSendResponse,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @HttpCode(HttpStatus.OK)
  async sendWelcomeEmail(
    @Body(ValidationPipe) dto: SendWelcomeEmailDto,
  ): Promise<EmailSendResponse> {
    return await this.emailService.sendWelcomeEmail(dto);
  }

  @Post('send-transaction')
  @ApiOperation({ summary: 'Send transaction notification email' })
  @ApiResponse({
    status: 200,
    description: 'Transaction email sent successfully',
    type: EmailSendResponse,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @HttpCode(HttpStatus.OK)
  async sendTransactionEmail(
    @Body(ValidationPipe) dto: SendTransactionEmailDto,
  ): Promise<EmailSendResponse> {
    return await this.emailService.sendTransactionEmail(dto);
  }

  @Post('send-promotional')
  @ApiOperation({ summary: 'Send promotional email' })
  @ApiResponse({
    status: 200,
    description: 'Promotional email sent successfully',
    type: EmailSendResponse,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @HttpCode(HttpStatus.OK)
  async sendPromotionalEmail(
    @Body(ValidationPipe) dto: SendPromotionalEmailDto,
  ): Promise<EmailSendResponse> {
    return await this.emailService.sendPromotionalEmail(dto);
  }

  @Post('send-bulk')
  @ApiOperation({ summary: 'Send bulk promotional emails' })
  @ApiResponse({
    status: 200,
    description: 'Bulk emails sent',
    type: [EmailSendResponse],
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @HttpCode(HttpStatus.OK)
  async sendBulkEmails(
    @Body(ValidationPipe) dto: BulkEmailDto,
  ): Promise<EmailSendResponse[]> {
    return await this.emailService.sendBulkEmails(dto);
  }

  @Put('update-api-key/:emailType')
  @ApiOperation({ summary: 'Update API key for email type' })
  @ApiResponse({
    status: 200,
    description: 'API key updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @HttpCode(HttpStatus.OK)
  async updateApiKey(
    @Param('emailType') emailType: EmailType,
    @Body('apiKey') apiKey: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.emailService.updateApiKey(emailType, apiKey);
    return {
      success: true,
      message: `API key updated successfully for ${emailType}`,
    };
  }

  @Get('test-configuration/:emailType')
  @ApiOperation({ summary: 'Test email configuration' })
  @ApiResponse({
    status: 200,
    description: 'Configuration test result',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @HttpCode(HttpStatus.OK)
  async testEmailConfiguration(
    @Param('emailType') emailType: EmailType,
  ): Promise<{ success: boolean; message: string }> {
    const isWorking = await this.emailService.testEmailConfiguration(emailType);
    return {
      success: isWorking,
      message: isWorking
        ? `Email configuration for ${emailType} is working correctly`
        : `Email configuration for ${emailType} is not working`,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get email statistics' })
  @ApiResponse({
    status: 200,
    description: 'Email statistics',
  })
  @HttpCode(HttpStatus.OK)
  async getEmailStats(): Promise<any> {
    return await this.emailService.getEmailStats();
  }

  // Debug endpoint to check email service configuration
  @Get('debug/config')
  async getEmailConfig(): Promise<any> {
    return {
      hasOtpClient: this.emailService['resendClients'].has(EmailType.OTP),
      hasWelcomeClient: this.emailService['resendClients'].has(EmailType.WELCOME),
      hasTransactionClient: this.emailService['resendClients'].has(EmailType.TRANSACTION),
      hasPromotionalClient: this.emailService['resendClients'].has(EmailType.PROMOTIONAL),
      // Don't expose actual API keys for security
      configuredTypes: Array.from(this.emailService['resendClients'].keys()),
    };
  }

  // Development/Testing endpoints
  @Post('test/send-sample-otp')
  @ApiOperation({ summary: 'Send sample OTP email (for testing)' })
  @ApiResponse({
    status: 200,
    description: 'Sample OTP email sent',
    type: EmailSendResponse,
  })
  @HttpCode(HttpStatus.OK)
  async sendSampleOtpEmail(): Promise<EmailSendResponse> {
    const sampleDto: SendOtpEmailDto = {
      email: 'test@example.com',
      name: 'Test User',
      otpCode: '123456',
      expirationMinutes: '5',
    };
    return await this.emailService.sendOtpEmail(sampleDto);
  }

  @Post('test/send-sample-welcome')
  @ApiOperation({ summary: 'Send sample welcome email (for testing)' })
  @ApiResponse({
    status: 200,
    description: 'Sample welcome email sent',
    type: EmailSendResponse,
  })
  @HttpCode(HttpStatus.OK)
  async sendSampleWelcomeEmail(): Promise<EmailSendResponse> {
    const sampleDto: SendWelcomeEmailDto = {
      email: 'test@example.com',
      name: 'Test User',
      virtualAccountNumber: '9038123456',
    };
    return await this.emailService.sendWelcomeEmail(sampleDto);
  }

  @Post('test/send-sample-transaction')
  @ApiOperation({ summary: 'Send sample transaction email (for testing)' })
  @ApiResponse({
    status: 200,
    description: 'Sample transaction email sent',
    type: EmailSendResponse,
  })
  @HttpCode(HttpStatus.OK)
  async sendSampleTransactionEmail(): Promise<EmailSendResponse> {
    const sampleDto: SendTransactionEmailDto = {
      email: 'test@example.com',
      name: 'Test User',
      transactionType: 'TRANSFER',
      amount: '5000.00',
      reference: 'TXN_' + Date.now(),
      status: 'COMPLETED',
      description: 'Transfer to savings account',
      transactionDate: new Date().toISOString(),
    };
    return await this.emailService.sendTransactionEmail(sampleDto);
  }

  @Post('test/send-sample-promotional')
  @ApiOperation({ summary: 'Send sample promotional email (for testing)' })
  @ApiResponse({
    status: 200,
    description: 'Sample promotional email sent',
    type: EmailSendResponse,
  })
  @HttpCode(HttpStatus.OK)
  async sendSamplePromotionalEmail(): Promise<EmailSendResponse> {
    const sampleDto: SendPromotionalEmailDto = {
      email: 'test@example.com',
      name: 'Test User',
      subject: 'Exciting New Features Available!',
      content: 'We\'ve launched amazing new features that will revolutionize your digital wallet experience.',
      templateData: {
        promoCode: 'NEWUSER50',
        expiryDate: '2024-12-31',
        features: [
          {
            icon: '🚀',
            title: 'Instant Transfers',
            description: 'Send money instantly to any bank account',
          },
          {
            icon: '💳',
            title: 'Virtual Cards',
            description: 'Generate virtual cards for online shopping',
          },
          {
            icon: '📊',
            title: 'Spending Analytics',
            description: 'Track your spending with detailed insights',
          },
          {
            icon: '🎁',
            title: 'Cashback Rewards',
            description: 'Earn cashback on every transaction',
          },
        ],
        stats: [
          { number: '50K+', label: 'Users' },
          { number: '₦1B+', label: 'Processed' },
          { number: '99.9%', label: 'Uptime' },
        ],
        testimonial: {
          text: 'Monzi has completely transformed how I manage my finances. The app is intuitive and the features are exactly what I needed.',
          author: 'Sarah Johnson, Lagos',
        },
        ctaTitle: 'Join the Financial Revolution',
        ctaDescription: 'Don\'t miss out on the future of digital payments!',
        ctaText: 'Get Started Now',
        ctaUrl: 'https://monzi.com/signup',
        secondaryCtaText: 'Learn More',
        secondaryCtaUrl: 'https://monzi.com/features',
      },
    };
    return await this.emailService.sendPromotionalEmail(sampleDto);
  }

  // Simple test endpoint without templates
  @Post('test/simple')
  async sendSimpleTestEmail(@Body() body: { email: string }): Promise<EmailSendResponse> {
    return await this.emailService.sendSimpleTestEmail(body.email);
  }

  // Test template loading endpoint
  @Get('test/template/:templateName')
  async testTemplateLoading(@Param('templateName') templateName: string): Promise<any> {
    return await this.emailService.testTemplateLoading(templateName);
  }

  // Template test endpoint
  @Post('test/template-email')
  async sendTemplateTestEmail(@Body() body: { email: string }): Promise<EmailSendResponse> {
    return await this.emailService.sendTemplateTestEmail(body.email);
  }
} 