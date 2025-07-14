import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EmailImagesService } from './email-images.service';
import {
  SendOtpEmailDto,
  SendWelcomeEmailDto,
  SendTransactionEmailDto,
  SendPromotionalEmailDto,
  BulkEmailDto,
  EmailSendResponse,
  EmailType,
  EmailConfig,
  EmailTemplate,
} from './dto/email.dto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resendClients: Map<EmailType, Resend> = new Map();
  private emailConfigs: Map<EmailType, EmailConfig> = new Map();

  constructor(
    private configService: ConfigService,
    private emailImagesService: EmailImagesService,
  ) {
    this.initializeEmailConfigs();
  }

  private initializeEmailConfigs() {
    // OTP and Welcome emails configuration - using verified domain
    const otpConfig: EmailConfig = {
      apiKey: this.configService.get<string>('RESEND_OTP_API_KEY', 're_9DfGdgC7_LZ72GHn1Q7D9zthGzKngrrrV'),
      fromEmail: 'noreply@monzi.money',
      fromName: 'Monzi',
    };

    // Transaction emails configuration (temporarily using same API key and verified domain)
    const transactionConfig: EmailConfig = {
      apiKey: this.configService.get<string>('RESEND_TRANSACTION_API_KEY', 're_9DfGdgC7_LZ72GHn1Q7D9zthGzKngrrrV'),
      fromEmail: 'transactions@monzi.money',
      fromName: 'Monzi Transactions',
    };

    // Promotional emails configuration (temporarily using same API key and verified domain)
    const promotionalConfig: EmailConfig = {
      apiKey: this.configService.get<string>('RESEND_PROMOTIONAL_API_KEY', 're_9DfGdgC7_LZ72GHn1Q7D9zthGzKngrrrV'),
      fromEmail: 'marketing@monzi.money',
      fromName: 'Monzi Team',
    };

    // Set configurations
    this.emailConfigs.set(EmailType.OTP, otpConfig);
    this.emailConfigs.set(EmailType.WELCOME, otpConfig); // Same as OTP
    this.emailConfigs.set(EmailType.TRANSACTION, otpConfig); // Use OTP config for now
    this.emailConfigs.set(EmailType.PROMOTIONAL, otpConfig); // Use OTP config for now

    // Initialize Resend clients
    this.emailConfigs.forEach((config, type) => {
      if (config.apiKey && config.apiKey !== 'placeholder' && config.apiKey.trim() !== '') {
        this.resendClients.set(type, new Resend(config.apiKey));
        this.logger.log(`Resend client initialized for ${type}`);
      } else {
        this.logger.warn(`Resend client not initialized for ${type} - missing or invalid API key`);
      }
    });

    this.logger.log('Email configurations initialized');
  }

  private getResendClient(emailType: EmailType): Resend {
    const client = this.resendClients.get(emailType);
    if (!client) {
      throw new BadRequestException(`Email client not configured for type: ${emailType}`);
    }
    return client;
  }

  private getEmailConfig(emailType: EmailType): EmailConfig {
    const config = this.emailConfigs.get(emailType);
    if (!config) {
      throw new BadRequestException(`Email configuration not found for type: ${emailType}`);
    }
    return config;
  }

  private loadTemplate(templateName: string): string {
    try {
      // Use the source directory path instead of __dirname which points to dist
      const templatePath = join(process.cwd(), 'src', 'email', 'templates', `${templateName}.html`);
      return readFileSync(templatePath, 'utf-8');
    } catch (error) {
      this.logger.error(`Failed to load email template: ${templateName}`, error);
      throw new BadRequestException(`Email template not found: ${templateName}`);
    }
  }

  private replaceTemplateVariables(template: string, variables: Record<string, any>): string {
    let compiledTemplate = template;
    
    // Replace simple variables {{variable}}
    Object.keys(variables).forEach(key => {
      const placeholder = `{{${key}}}`;
      const value = variables[key] || '';
      compiledTemplate = compiledTemplate.replace(new RegExp(placeholder, 'g'), value);
    });

    // Handle conditional blocks {{#if condition}}...{{/if}}
    compiledTemplate = compiledTemplate.replace(
      /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (match, condition, content) => {
        // Simple condition check for variables
        const conditionValue = variables[condition.trim()];
        return conditionValue ? content : '';
      }
    );

    // Handle each loops {{#each array}}...{{/each}}
    compiledTemplate = compiledTemplate.replace(
      /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
      (match, arrayName, content) => {
        const array = variables[arrayName.trim()];
        if (!Array.isArray(array)) return '';
        
        return array.map(item => {
          let itemContent = content;
          Object.keys(item).forEach(key => {
            const placeholder = `{{${key}}}`;
            itemContent = itemContent.replace(new RegExp(placeholder, 'g'), item[key]);
          });
          return itemContent;
        }).join('');
      }
    );

    return compiledTemplate;
  }

  private generatePlainTextFromHtml(html: string): string {
    // Basic HTML to text conversion
    return html
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async sendOtpEmail(dto: SendOtpEmailDto): Promise<EmailSendResponse> {
    this.logger.log(`Sending OTP email to: ${dto.email}`);
    
    try {
      const template = this.loadTemplate('otp-email');
      const config = this.getEmailConfig(EmailType.OTP);
      const resend = this.getResendClient(EmailType.OTP);

      const templateVariables = {
        name: dto.name,
        otp: dto.otpCode, // Template expects 'otp', not 'otpCode'
        expirationTime: dto.expirationMinutes || '15', // Template expects 'expirationTime', not 'expirationMinutes'
        logoUrl: this.emailImagesService.getLogoUrl(),
        // whatsappUrl: this.emailImagesService.getImageUrl('monzi/emails/monzi/emails/whatsapp', 24),
        // instagramUrl: this.emailImagesService.getImageUrl('monzi/emails/monzi/emails/instagram', 24),
        // twitterUrl: this.emailImagesService.getImageUrl('monzi/emails/monzi/emails/twitter', 24),
      };

      const htmlContent = this.replaceTemplateVariables(template, templateVariables);
      const textContent = this.generatePlainTextFromHtml(htmlContent);

      const result = await resend.emails.send({
        from: `${config.fromName} <${config.fromEmail}>`,
        to: [dto.email],
        subject: `Your OTP Code - ${dto.otpCode}`,
        html: htmlContent,
        text: textContent,
        tags: [
          { name: 'email-type', value: 'otp' },
        ],
      });

      // Debug: Log the complete response
      this.logger.log(`Resend API response:`, JSON.stringify(result, null, 2));
      this.logger.log(`Response data:`, result.data);
      this.logger.log(`Response error:`, result.error);

      this.logger.log(`OTP email sent successfully to: ${dto.email}, ID: ${result.data?.id || 'unknown'}`);

      return {
        success: true,
        message: 'OTP email sent successfully',
        emailId: result.data?.id || undefined,
        type: EmailType.OTP,
      };
    } catch (error) {
      this.logger.error(`Failed to send OTP email to: ${dto.email}`, error);
      throw new BadRequestException('Failed to send OTP email');
    }
  }

  async sendWelcomeEmail(dto: SendWelcomeEmailDto): Promise<EmailSendResponse> {
    this.logger.log(`Sending welcome email to: ${dto.email}`);
    
    try {
      const template = this.loadTemplate('welcome-email');
      const config = this.getEmailConfig(EmailType.WELCOME);
      const resend = this.getResendClient(EmailType.WELCOME);

      const templateVariables = {
        name: dto.name,
        virtualAccountNumber: dto.virtualAccountNumber,
        logoUrl: this.emailImagesService.getLogoUrl(),
        bannerUrl: this.emailImagesService.getBannerUrl(),
        // whatsappUrl: this.emailImagesService.getImageUrl('monzi/emails/monzi/emails/whatsapp', 24),
        // instagramUrl: this.emailImagesService.getImageUrl('monzi/emails/monzi/emails/instagram', 24),
        // twitterUrl: this.emailImagesService.getImageUrl('monzi/emails/monzi/emails/twitter', 24),
      };

      const htmlContent = this.replaceTemplateVariables(template, templateVariables);
      const textContent = this.generatePlainTextFromHtml(htmlContent);

      const result = await resend.emails.send({
        from: `${config.fromName} <${config.fromEmail}>`,
        to: [dto.email],
        subject: `Welcome to Monzi, ${dto.name}! 🎉`,
        html: htmlContent,
        text: textContent,
        tags: [
          { name: 'email-type', value: 'welcome' },
        ],
      });

      this.logger.log(`Welcome email sent successfully to: ${dto.email}, ID: ${result.data?.id || 'unknown'}`);

      return {
        success: true,
        message: 'Welcome email sent successfully',
        emailId: result.data?.id || undefined,
        type: EmailType.WELCOME,
      };
    } catch (error) {
      this.logger.error(`Failed to send welcome email to: ${dto.email}`, error);
      throw new BadRequestException('Failed to send welcome email');
    }
  }

  async sendTransactionEmail(dto: SendTransactionEmailDto): Promise<EmailSendResponse> {
    this.logger.log(`Sending transaction email to: ${dto.email}`);
    
    try {
      const template = this.loadTemplate('transaction-email');
      const config = this.getEmailConfig(EmailType.TRANSACTION);
      const resend = this.getResendClient(EmailType.TRANSACTION);

      const templateVariables = {
        name: dto.name,
        transactionType: dto.transactionType,
        amount: dto.amount,
        reference: dto.reference,
        status: dto.status,
        description: dto.description,
        transactionDate: dto.transactionDate,
        logoUrl: this.emailImagesService.getLogoUrl(),
        // whatsappUrl: this.emailImagesService.getImageUrl('monzi/emails/monzi/emails/whatsapp', 24),
        // instagramUrl: this.emailImagesService.getImageUrl('monzi/emails/monzi/emails/instagram', 24),
        // twitterUrl: this.emailImagesService.getImageUrl('monzi/emails/monzi/emails/twitter', 24),
      };

      const htmlContent = this.replaceTemplateVariables(template, templateVariables);
      const textContent = this.generatePlainTextFromHtml(htmlContent);

      const statusEmoji = dto.status === 'COMPLETED' ? '✅' : dto.status === 'FAILED' ? '❌' : '⏳';
      const statusText = dto.status === 'COMPLETED' ? 'Successful' : dto.status === 'FAILED' ? 'Failed' : 'Pending';

      const result = await resend.emails.send({
        from: `${config.fromName} <${config.fromEmail}>`,
        to: [dto.email],
        subject: `${statusEmoji} Transaction ${statusText} - ₦${dto.amount}`,
        html: htmlContent,
        text: textContent,
        tags: [
          { name: 'email-type', value: 'transaction' },
          { name: 'transaction-type', value: dto.transactionType },
          { name: 'transaction-status', value: dto.status },
        ],
      });

      this.logger.log(`Transaction email sent successfully to: ${dto.email}, ID: ${result.data?.id || 'unknown'}`);

      return {
        success: true,
        message: 'Transaction email sent successfully',
        emailId: result.data?.id || undefined,
        type: EmailType.TRANSACTION,
      };
    } catch (error) {
      this.logger.error(`Failed to send transaction email to: ${dto.email}`, error);
      throw new BadRequestException('Failed to send transaction email');
    }
  }

  async sendPromotionalEmail(dto: SendPromotionalEmailDto): Promise<EmailSendResponse> {
    this.logger.log(`Sending promotional email to: ${dto.email}`);
    
    try {
      const template = this.loadTemplate('promotional-email');
      const config = this.getEmailConfig(EmailType.PROMOTIONAL);
      const resend = this.getResendClient(EmailType.PROMOTIONAL);

      const templateVariables = {
        name: dto.name,
        subject: dto.subject,
        content: dto.content,
        templateData: dto.templateData || {},
        logoUrl: this.emailImagesService.getLogoUrl(),
      };

      const htmlContent = this.replaceTemplateVariables(template, templateVariables);
      const textContent = this.generatePlainTextFromHtml(htmlContent);

      const result = await resend.emails.send({
        from: `${config.fromName} <${config.fromEmail}>`,
        to: [dto.email],
        subject: dto.subject,
        html: htmlContent,
        text: textContent,
        tags: [
          { name: 'email-type', value: 'promotional' },
        ],
      });

      this.logger.log(`Promotional email sent successfully to: ${dto.email}, ID: ${result.data?.id || 'unknown'}`);

      return {
        success: true,
        message: 'Promotional email sent successfully',
        emailId: result.data?.id || undefined,
        type: EmailType.PROMOTIONAL,
      };
    } catch (error) {
      this.logger.error(`Failed to send promotional email to: ${dto.email}`, error);
      throw new BadRequestException('Failed to send promotional email');
    }
  }

  async sendDeviceChangeEmail(dto: {
    email: string;
    name: string;
    deviceName: string;
    platform: string;
    location?: string;
    timestamp: string;
  }): Promise<EmailSendResponse> {
    this.logger.log(`Sending device change email to: ${dto.email}`);
    
    try {
      const template = this.loadTemplate('device-change-email');
      const config = this.getEmailConfig(EmailType.OTP); // Use OTP config for security emails
      const resend = this.getResendClient(EmailType.OTP);

      const templateVariables = {
        'First Name': dto.name,
        'Device Name': dto.deviceName,
        'Platform': dto.platform,
        'Location': dto.location || 'Unknown',
        'Timestamp': dto.timestamp,
        logoUrl: this.emailImagesService.getLogoUrl(),
        // whatsappUrl: this.emailImagesService.getImageUrl('monzi/emails/monzi/emails/whatsapp', 24),
        // instagramUrl: this.emailImagesService.getImageUrl('monzi/emails/monzi/emails/instagram', 24),
        // twitterUrl: this.emailImagesService.getImageUrl('monzi/emails/monzi/emails/twitter', 24),
      };

      const htmlContent = this.replaceTemplateVariables(template, templateVariables);
      const textContent = this.generatePlainTextFromHtml(htmlContent);

      const result = await resend.emails.send({
        from: `${config.fromName} <${config.fromEmail}>`,
        to: [dto.email],
        subject: 'New Device Detected - Monzi Security Alert',
        html: htmlContent,
        text: textContent,
        tags: [
          { name: 'email-type', value: 'security' },
          { name: 'notification-type', value: 'device-change' },
        ],
      });

      this.logger.log(`Device change email sent successfully to: ${dto.email}, ID: ${result.data?.id || 'unknown'}`);

      return {
        success: true,
        message: 'Device change email sent successfully',
        emailId: result.data?.id || undefined,
        type: EmailType.OTP, // Using OTP type for security emails
      };
    } catch (error) {
      this.logger.error(`Failed to send device change email to: ${dto.email}`, error);
      throw new BadRequestException('Failed to send device change email');
    }
  }

  async sendKycApprovalEmail(dto: {
    email: string;
    name: string;
    walletCreated?: boolean;
    virtualAccountNumber?: string;
    walletProvider?: string;
  }): Promise<EmailSendResponse> {
    this.logger.log(`Sending KYC approval email to: ${dto.email}`);
    
    try {
      const template = this.loadTemplate('kyc-approved');
      const config = this.getEmailConfig(EmailType.OTP);
      const resend = this.getResendClient(EmailType.OTP);

      const templateVariables = {
        name: dto.name,
        email: dto.email,
        walletCreated: dto.walletCreated || false,
        virtualAccountNumber: dto.virtualAccountNumber || '',
        walletProvider: dto.walletProvider || 'Monzi',
        appUrl: this.configService.get<string>('APP_URL') || 'https://monzi.money',
      };

      const htmlContent = this.replaceTemplateVariables(template, templateVariables);
      const textContent = this.generatePlainTextFromHtml(htmlContent);

      const result = await resend.emails.send({
        from: `${config.fromName} <${config.fromEmail}>`,
        to: [dto.email],
        subject: '🎉 KYC Approved - Your Monzi Account is Ready!',
        html: htmlContent,
        text: textContent,
        tags: [
          { name: 'email-type', value: 'kyc-approval' },
        ],
      });

      this.logger.log(`KYC approval email sent successfully to: ${dto.email}, ID: ${result.data?.id || 'unknown'}`);

      return {
        success: true,
        message: 'KYC approval email sent successfully',
        emailId: result.data?.id || undefined,
        type: EmailType.OTP,
      };
    } catch (error) {
      this.logger.error(`Failed to send KYC approval email to: ${dto.email}`, error);
      throw new BadRequestException('Failed to send KYC approval email');
    }
  }

  async sendBulkEmails(dto: BulkEmailDto): Promise<EmailSendResponse[]> {
    this.logger.log(`Sending bulk emails to ${dto.emails.length} recipients`);
    
    const results: EmailSendResponse[] = [];
    
    for (const email of dto.emails) {
      try {
        const promotionalDto: SendPromotionalEmailDto = {
          email,
          name: email.split('@')[0], // Simple name extraction
          subject: dto.subject,
          content: 'Check out our latest updates!',
          templateData: dto.templateData,
        };

        const result = await this.sendPromotionalEmail(promotionalDto);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to send bulk email to: ${email}`, error);
        results.push({
          success: false,
          message: `Failed to send email to ${email}`,
          type: EmailType.PROMOTIONAL,
        });
      }
    }

    return results;
  }

  // Method to update API keys for different email types
  async updateApiKey(emailType: EmailType, apiKey: string): Promise<void> {
    this.logger.log(`Updating API key for email type: ${emailType}`);
    
    const config = this.emailConfigs.get(emailType);
    if (config) {
      config.apiKey = apiKey;
      this.resendClients.set(emailType, new Resend(apiKey));
      this.logger.log(`API key updated successfully for email type: ${emailType}`);
    } else {
      throw new BadRequestException(`Email type not found: ${emailType}`);
    }
  }

  // Method to test email configuration
  async testEmailConfiguration(emailType: EmailType): Promise<boolean> {
    try {
      const resend = this.getResendClient(emailType);
      const config = this.getEmailConfig(emailType);
      
      // Try to send a test email to a safe address
      await resend.emails.send({
        from: `${config.fromName} <${config.fromEmail}>`,
        to: ['test@resend.dev'],
        subject: 'Test Email Configuration',
        html: '<p>This is a test email to verify configuration.</p>',
      });

      return true;
    } catch (error) {
      this.logger.error(`Email configuration test failed for type: ${emailType}`, error);
      return false;
    }
  }

  // Method to get email statistics (placeholder for future implementation)
  async getEmailStats(): Promise<any> {
    return {
      totalSent: 0,
      successRate: 0,
      lastSent: null,
      configurations: {
        otp: this.resendClients.has(EmailType.OTP),
        welcome: this.resendClients.has(EmailType.WELCOME),
        transaction: this.resendClients.has(EmailType.TRANSACTION),
        promotional: this.resendClients.has(EmailType.PROMOTIONAL),
      },
    };
  }

  // Simple test method without templates
  async sendSimpleTestEmail(email: string): Promise<EmailSendResponse> {
    this.logger.log(`Sending simple test email to: ${email}`);
    
    try {
      const config = this.getEmailConfig(EmailType.OTP);
      const resend = this.getResendClient(EmailType.OTP);

      this.logger.log(`Using API key: ${config.apiKey.substring(0, 10)}...`);
      this.logger.log(`Using from email: ${config.fromEmail}`);

      const result = await resend.emails.send({
        from: `${config.fromName} <${config.fromEmail}>`,
        to: [email],
        subject: 'Simple Test Email',
        html: '<h1>Test Email</h1><p>This is a simple test email without templates.</p>',
        text: 'Test Email - This is a simple test email without templates.',
      });

      this.logger.log(`Complete Resend response:`, JSON.stringify(result, null, 2));
      
      if (result.error) {
        this.logger.error(`Resend API error:`, result.error);
        throw new Error(`Resend API error: ${JSON.stringify(result.error)}`);
      }

      this.logger.log(`Simple test email sent successfully to: ${email}, ID: ${result.data?.id || 'NO-ID'}`);

      return {
        success: true,
        message: 'Simple test email sent successfully',
        emailId: result.data?.id || undefined,
        type: EmailType.OTP,
      };
    } catch (error) {
      this.logger.error(`Failed to send simple test email to: ${email}`, error);
      throw new BadRequestException(`Failed to send simple test email: ${error.message}`);
    }
  }

  // Test method to check template loading
  async testTemplateLoading(templateName: string): Promise<any> {
    this.logger.log(`Testing template loading for: ${templateName}`);
    
    try {
      // Test template loading
      const template = this.loadTemplate(templateName);
      this.logger.log(`Template loaded successfully, length: ${template.length} characters`);
      
      // Test template variable replacement
      const templateVariables = {
        name: 'Test User',
        otpCode: '123456',
        expirationMinutes: '5',
      };
      
      const processedTemplate = this.replaceTemplateVariables(template, templateVariables);
      this.logger.log(`Template processed successfully, length: ${processedTemplate.length} characters`);
      
      return {
        success: true,
        originalLength: template.length,
        processedLength: processedTemplate.length,
        preview: processedTemplate.substring(0, 200) + '...',
      };
    } catch (error) {
      this.logger.error(`Template loading failed for ${templateName}:`, error);
      throw new BadRequestException(`Template loading failed: ${error.message}`);
    }
  }

  // Test method with actual template content
  async sendTemplateTestEmail(email: string): Promise<EmailSendResponse> {
    this.logger.log(`Sending template test email to: ${email}`);
    
    try {
      const config = this.getEmailConfig(EmailType.OTP);
      const resend = this.getResendClient(EmailType.OTP);

      // Load and process the actual template
      const template = this.loadTemplate('otp-email');
      const templateVariables = {
        name: 'Test User',
        otpCode: '123456',
        expirationMinutes: '5',
      };
      const htmlContent = this.replaceTemplateVariables(template, templateVariables);
      const textContent = this.generatePlainTextFromHtml(htmlContent);

      this.logger.log(`Template content length: ${htmlContent.length} characters`);
      this.logger.log(`Text content length: ${textContent.length} characters`);

      const result = await resend.emails.send({
        from: `${config.fromName} <${config.fromEmail}>`,
        to: [email],
        subject: 'Template Test Email - OTP Style',
        html: htmlContent,
        text: textContent,
        tags: [
          { name: 'email-type', value: 'template-test' },
        ],
      });

      this.logger.log(`Template test email complete response:`, JSON.stringify(result, null, 2));
      
      if (result.error) {
        this.logger.error(`Resend API error in template test:`, result.error);
        throw new Error(`Resend API error: ${JSON.stringify(result.error)}`);
      }

      this.logger.log(`Template test email sent successfully to: ${email}, ID: ${result.data?.id || 'NO-ID'}`);

      return {
        success: true,
        message: 'Template test email sent successfully',
        emailId: result.data?.id || undefined,
        type: EmailType.OTP,
      };
    } catch (error) {
      this.logger.error(`Failed to send template test email to: ${email}`, error);
      throw new BadRequestException(`Failed to send template test email: ${error.message}`);
    }
  }
}