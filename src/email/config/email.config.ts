export const EMAIL_CONFIG = {
  // OTP and Welcome emails
  OTP_WELCOME: {
    API_KEY: 're_9DfGdgC7_LZ72GHn1Q7D9zthGzKngrrrV',
    FROM_EMAIL: 'noreply@monzi.com',
    FROM_NAME: 'Monzi',
    DESCRIPTION:
      'Used for OTP verification and welcome emails after successful signup',
  },

  // Transaction notification emails (placeholder for future API key)
  TRANSACTION: {
    API_KEY: process.env.RESEND_TRANSACTION_API_KEY || 'placeholder',
    FROM_EMAIL: 'transactions@monzi.com',
    FROM_NAME: 'Monzi Transactions',
    DESCRIPTION: 'Used for transaction notifications and receipts',
  },

  // Promotional emails (placeholder for future API key)
  PROMOTIONAL: {
    API_KEY: process.env.RESEND_PROMOTIONAL_API_KEY || 'placeholder',
    FROM_EMAIL: 'marketing@monzi.com',
    FROM_NAME: 'Monzi Team',
    DESCRIPTION: 'Used for marketing campaigns and promotional emails',
  },

  // Email templates configuration
  TEMPLATES: {
    OTP_EMAIL: {
      NAME: 'otp-email',
      SUBJECT: 'Your OTP Code - {{otpCode}}',
      DESCRIPTION: 'Email template for OTP verification',
    },
    WELCOME_EMAIL: {
      NAME: 'welcome-email',
      SUBJECT: 'Welcome to Monzi, {{name}}! 🎉',
      DESCRIPTION: 'Email template for welcome messages',
    },
    TRANSACTION_EMAIL: {
      NAME: 'transaction-email',
      SUBJECT: '{{statusEmoji}} Transaction {{statusText}} - ₦{{amount}}',
      DESCRIPTION: 'Email template for transaction notifications',
    },
    PROMOTIONAL_EMAIL: {
      NAME: 'promotional-email',
      SUBJECT: '{{subject}}',
      DESCRIPTION: 'Email template for promotional campaigns',
    },
  },

  // Email sending limits and configuration
  LIMITS: {
    BULK_EMAIL_MAX_RECIPIENTS: 100,
    DAILY_LIMIT_PER_USER: 10,
    RETRY_ATTEMPTS: 3,
    TIMEOUT_MS: 30000,
  },

  // Email validation patterns
  VALIDATION: {
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    OTP_REGEX: /^\d{6}$/,
    PHONE_REGEX: /^\+?[1-9]\d{1,14}$/,
  },

  // Environment-specific settings
  ENVIRONMENT: {
    DEVELOPMENT: {
      ENABLE_TEST_ENDPOINTS: true,
      LOG_LEVEL: 'debug',
      MOCK_EMAILS: false,
    },
    PRODUCTION: {
      ENABLE_TEST_ENDPOINTS: false,
      LOG_LEVEL: 'info',
      MOCK_EMAILS: false,
    },
  },

  // Error messages
  ERROR_MESSAGES: {
    INVALID_EMAIL: 'Invalid email address format',
    INVALID_OTP: 'OTP must be 6 digits',
    TEMPLATE_NOT_FOUND: 'Email template not found',
    API_KEY_MISSING: 'API key not configured for email type',
    SEND_FAILED: 'Failed to send email',
    RATE_LIMIT_EXCEEDED: 'Email rate limit exceeded',
  },
};

export const getEmailConfig = (emailType: string) => {
  switch (emailType.toUpperCase()) {
    case 'OTP':
    case 'WELCOME':
      return EMAIL_CONFIG.OTP_WELCOME;
    case 'TRANSACTION':
      return EMAIL_CONFIG.TRANSACTION;
    case 'PROMOTIONAL':
      return EMAIL_CONFIG.PROMOTIONAL;
    default:
      throw new Error(`Unknown email type: ${emailType}`);
  }
};

export const isEmailConfigured = (emailType: string): boolean => {
  try {
    const config = getEmailConfig(emailType);
    return config.API_KEY !== 'placeholder' && config.API_KEY.length > 0;
  } catch {
    return false;
  }
};

export const getAvailableEmailTypes = (): string[] => {
  return ['OTP', 'WELCOME', 'TRANSACTION', 'PROMOTIONAL'];
};

export const getConfiguredEmailTypes = (): string[] => {
  return getAvailableEmailTypes().filter((type) => isEmailConfigured(type));
};
