import { Injectable, Logger } from '@nestjs/common';
import { AdminEndpointMapperService } from './admin-endpoint-mapper.service';

export interface UserQuery {
  type:
    | 'USER_LOOKUP'
    | 'TRANSACTION_HISTORY'
    | 'SYSTEM_STATUS'
    | 'WALLET_OPERATIONS'
    | 'KYC_MANAGEMENT'
    | 'ADMIN_OPERATIONS'
    | 'FEE_MANAGEMENT'
    | 'ANALYTICS'
    | 'GENERAL_QUERY';
  userId?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  transactionId?: string;
  walletId?: string;
  adminId?: string;
  timeFrame?: {
    start?: string;
    end?: string;
    period?: string; // 'today', 'week', 'month', 'year', 'custom'
  };
  filters?: Record<string, any>;
  intent?: string;
  confidence?: number;
  suggestedEndpoints?: string[];
  extractedEntities?: {
    emails?: string[];
    names?: string[];
    amounts?: number[];
    dates?: string[];
    ids?: string[];
    phoneNumbers?: string[];
  };
}

@Injectable()
export class QueryAnalyzerService {
  private readonly logger = new Logger(QueryAnalyzerService.name);

  constructor(
    private readonly adminEndpointMapper: AdminEndpointMapperService,
  ) {}

  /**
   * Super smart query analysis with comprehensive intent recognition
   */
  analyzeUserQuery(message: string): UserQuery {
    const lowerMessage = message.toLowerCase();
    const extractedEntities = this.extractAllEntities(message);

    // Analyze intent with high confidence scoring
    const intentAnalysis = this.analyzeIntent(lowerMessage, extractedEntities);

    const baseQuery: UserQuery = {
      type: intentAnalysis.type,
      intent: intentAnalysis.intent,
      confidence: intentAnalysis.confidence,
      extractedEntities,
      suggestedEndpoints: intentAnalysis.suggestedEndpoints,
    };

    // Add specific extracted data based on intent
    switch (intentAnalysis.type) {
      case 'USER_LOOKUP':
        return {
          ...baseQuery,
          userEmail: extractedEntities.emails?.[0],
          userName: extractedEntities.names?.[0],
          userPhone: extractedEntities.phoneNumbers?.[0],
          userId: extractedEntities.ids?.[0],
          timeFrame: this.extractTimeFrame(message),
        };

      case 'TRANSACTION_HISTORY':
        return {
          ...baseQuery,
          userEmail: extractedEntities.emails?.[0],
          userName: extractedEntities.names?.[0],
          transactionId: extractedEntities.ids?.[0],
          timeFrame: this.extractTimeFrame(message),
          filters: this.extractTransactionFilters(message),
        };

      case 'WALLET_OPERATIONS':
        return {
          ...baseQuery,
          userEmail: extractedEntities.emails?.[0],
          userName: extractedEntities.names?.[0],
          walletId: extractedEntities.ids?.[0],
          filters: {
            amount: extractedEntities.amounts?.[0],
            operation: this.extractWalletOperation(message),
          },
        };

      case 'KYC_MANAGEMENT':
        return {
          ...baseQuery,
          userEmail: extractedEntities.emails?.[0],
          userName: extractedEntities.names?.[0],
          userId: extractedEntities.ids?.[0],
          filters: this.extractKycFilters(message),
        };

      case 'SYSTEM_STATUS':
      case 'ANALYTICS':
        return {
          ...baseQuery,
          timeFrame: this.extractTimeFrame(message),
          filters: this.extractAnalyticsFilters(message),
        };

      case 'ADMIN_OPERATIONS':
        return {
          ...baseQuery,
          adminId: extractedEntities.ids?.[0],
          userEmail: extractedEntities.emails?.[0],
          filters: this.extractAdminFilters(message),
        };

      case 'FEE_MANAGEMENT':
        return {
          ...baseQuery,
          filters: this.extractFeeFilters(message),
        };

      default:
        return baseQuery;
    }
  }

  /**
   * Advanced intent analysis with confidence scoring
   */
  private analyzeIntent(
    lowerMessage: string,
    entities: any,
  ): {
    type: UserQuery['type'];
    intent: string;
    confidence: number;
    suggestedEndpoints: string[];
  } {
    const patterns = [
      // SYSTEM STATUS PATTERNS (High Priority - Check First)
      {
        type: 'SYSTEM_STATUS' as const,
        patterns: [
          /(?:system|platform|dashboard)\s+(?:status|health|metrics|stats)/i,
          /(?:show|get|display)\s+(?:dashboard|stats|metrics|analytics)/i,
          /(?:overall|total|platform)\s+(?:performance|statistics|overview)/i,
          /health\s+check/i,
          /show\s+me\s+(?:system|platform|dashboard)/i,
          /(?:current|latest)\s+(?:system|platform)\s+(?:status|metrics)/i,
          /how\s+is\s+(?:the\s+)?(?:system|platform)/i,
        ],
        intent: 'Display system status and performance metrics',
        endpoints: ['/admin/dashboard/stats', '/admin/auditor/health'],
        confidence: 0.9,
      },

      // USER LOOKUP PATTERNS
      {
        type: 'USER_LOOKUP' as const,
        patterns: [
          /(?:what is|who is|tell me about)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i, // Email pattern
          /(?:what is|who is|tell me about)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i, // Name pattern
          /(?:show me|find|search for|get info about|details about|profile of)\s+(?:user|account)\s+([^?]+)/i,
          /user\s+(?:details|info|profile|data)/i,
          /(?:check|lookup|find)\s+user/i,
        ],
        intent: 'Find and display comprehensive user information',
        endpoints: [
          '/admin/users',
          '/admin/users/:userId',
          '/admin/kyc/submissions/:userId',
        ],
        confidence: 0.9,
      },

      // TRANSACTION PATTERNS
      {
        type: 'TRANSACTION_HISTORY' as const,
        patterns: [
          /(?:transaction|payment|transfer)s?\s*(?:history|list|records|data)/i,
          /(?:show|get|find|list)\s+(?:transaction|payment|transfer)s?/i,
          /(?:recent|latest|last)\s+(?:transaction|payment|transfer)s?/i,
          /(?:transaction|payment|transfer)s?\s+(?:for|by|from|of)\s+/i,
        ],
        intent: 'Retrieve and analyze transaction history',
        endpoints: [
          '/admin/transactions',
          '/admin/transactions/:transactionId',
        ],
        confidence: 0.85,
      },

      // WALLET OPERATIONS
      {
        type: 'WALLET_OPERATIONS' as const,
        patterns: [
          /(?:wallet|balance|fund|debit|credit|freeze|unfreeze)/i,
          /(?:check|show|get)\s+(?:wallet|balance)/i,
          /(?:fund|add money|credit|debit|withdraw)\s+(?:wallet|account)/i,
          /(?:freeze|unfreeze|lock|unlock)\s+(?:wallet|account)/i,
          /(?:total|platform)\s+balance/i,
        ],
        intent: 'Perform wallet operations and balance checks',
        endpoints: [
          '/admin/wallet/balance',
          '/admin/wallet/total-balance',
          '/admin/fund-wallet',
          '/admin/debit-wallet',
        ],
        confidence: 0.9,
      },

      // KYC MANAGEMENT
      {
        type: 'KYC_MANAGEMENT' as const,
        patterns: [
          /kyc\s*(?:status|submission|verification|review|approval)/i,
          /(?:verify|approve|reject|review)\s+(?:kyc|identity|document)/i,
          /(?:pending|approved|rejected)\s+kyc/i,
          /identity\s+verification/i,
        ],
        intent: 'Manage KYC submissions and verification process',
        endpoints: [
          '/admin/kyc/submissions',
          '/admin/kyc/submissions/:userId',
          '/admin/kyc/submissions/pending',
        ],
        confidence: 0.95,
      },

      // ANALYTICS
      {
        type: 'ANALYTICS' as const,
        patterns: [
          /(?:analytics|analysis|report|insights|trends)/i,
          /(?:financial|revenue|growth|performance)\s+(?:analysis|report)/i,
          /(?:user|customer)\s+(?:behavior|analytics|insights)/i,
          /(?:monthly|weekly|daily)\s+(?:report|stats|analysis)/i,
        ],
        intent: 'Generate analytics and business insights',
        endpoints: [
          '/admin/dashboard/stats',
          '/admin/transactions',
          '/admin/users',
        ],
        confidence: 0.75,
      },

      // ADMIN OPERATIONS
      {
        type: 'ADMIN_OPERATIONS' as const,
        patterns: [
          /(?:admin|administrator)\s+(?:user|account|management)/i,
          /(?:create|add|remove|delete)\s+admin/i,
          /admin\s+(?:list|users|accounts)/i,
          /(?:manage|edit|update)\s+admin/i,
          /(?:show|get|display)\s+(?:admin\s+)?logs?/i,
          /admin\s+(?:activity|logs?|actions?)/i,
          /(?:activity|action)\s+logs?/i,
        ],
        intent: 'Manage admin users and permissions',
        endpoints: [
          '/admin/admins',
          '/admin/create-admin',
          '/admin/admins/:adminId',
          '/admin/logs',
        ],
        confidence: 0.9,
      },

      // FEE MANAGEMENT
      {
        type: 'FEE_MANAGEMENT' as const,
        patterns: [
          /(?:fee|charge|commission)\s*(?:configuration|setup|management)/i,
          /(?:set|update|change|modify)\s+(?:fee|charge)/i,
          /(?:transaction|transfer|payment)\s+(?:fee|charge)/i,
          /fee\s+(?:structure|rates|pricing)/i,
        ],
        intent: 'Configure and manage transaction fees',
        endpoints: ['/admin/fees', '/admin/fees/:type'],
        confidence: 0.85,
      },
    ];

    // Find best matching pattern
    let bestMatch: {
      type: UserQuery['type'];
      intent: string;
      confidence: number;
      endpoints: string[];
    } = {
      type: 'GENERAL_QUERY',
      intent: 'General inquiry requiring contextual response',
      confidence: 0.3,
      endpoints: [],
    };

    for (const pattern of patterns) {
      for (const regex of pattern.patterns) {
        if (regex.test(lowerMessage)) {
          if (pattern.confidence > bestMatch.confidence) {
            bestMatch = {
              type: pattern.type,
              intent: pattern.intent,
              confidence: pattern.confidence,
              endpoints: pattern.endpoints,
            };
          }
        }
      }
    }

    // Boost confidence if we have relevant entities
    if (entities.emails?.length > 0 || entities.names?.length > 0) {
      bestMatch.confidence = Math.min(bestMatch.confidence + 0.1, 1.0);
    }

    return {
      type: bestMatch.type,
      intent: bestMatch.intent,
      confidence: bestMatch.confidence,
      suggestedEndpoints: bestMatch.endpoints,
    };
  }

  /**
   * Extract all entities from the message
   */
  private extractAllEntities(message: string): UserQuery['extractedEntities'] {
    return {
      emails: this.extractEmails(message),
      names: this.extractNames(message),
      amounts: this.extractAmounts(message),
      dates: this.extractDates(message),
      ids: this.extractIds(message),
      phoneNumbers: this.extractPhoneNumbers(message),
    };
  }

  /**
   * Extract email addresses
   */
  private extractEmails(message: string): string[] {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    return message.match(emailRegex) || [];
  }

  /**
   * Extract names (capitalized words)
   */
  private extractNames(message: string): string[] {
    // Look for patterns like "tell me about John Doe" or "user John Smith"
    const namePatterns = [
      /(?:tell me about|who is|what is|user|for|about)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /([A-Z][a-z]+\s+[A-Z][a-z]+)/g, // Two capitalized words
    ];

    const names: string[] = [];
    for (const pattern of namePatterns) {
      const matches = message.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && !names.includes(match[1])) {
          names.push(match[1]);
        }
      }
    }
    return names;
  }

  /**
   * Extract monetary amounts
   */
  private extractAmounts(message: string): number[] {
    const amountPatterns = [
      /₦\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*naira/gi,
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*NGN/gi,
      /amount\s*:?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
    ];

    const amounts: number[] = [];
    for (const pattern of amountPatterns) {
      const matches = message.matchAll(pattern);
      for (const match of matches) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(amount)) {
          amounts.push(amount);
        }
      }
    }
    return amounts;
  }

  /**
   * Extract dates
   */
  private extractDates(message: string): string[] {
    const datePatterns = [
      /\d{4}-\d{2}-\d{2}/g,
      /\d{1,2}\/\d{1,2}\/\d{4}/g,
      /\d{1,2}-\d{1,2}-\d{4}/g,
      /(today|yesterday|tomorrow)/gi,
      /(last|this|next)\s+(week|month|year)/gi,
    ];

    const dates: string[] = [];
    for (const pattern of datePatterns) {
      const matches = message.match(pattern);
      if (matches) {
        dates.push(...matches);
      }
    }
    return dates;
  }

  /**
   * Extract IDs (user IDs, transaction IDs, etc.)
   */
  private extractIds(message: string): string[] {
    const idPatterns = [
      /(?:id|ID)\s*:?\s*([a-zA-Z0-9_-]+)/g,
      /(?:user|transaction|wallet|admin)\s*(?:id|ID)\s*:?\s*([a-zA-Z0-9_-]+)/gi,
      /([a-zA-Z0-9]{20,})/g, // Long alphanumeric strings (likely IDs)
    ];

    const ids: string[] = [];
    for (const pattern of idPatterns) {
      const matches = message.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && !ids.includes(match[1])) {
          ids.push(match[1]);
        }
      }
    }
    return ids;
  }

  /**
   * Extract phone numbers
   */
  private extractPhoneNumbers(message: string): string[] {
    const phonePatterns = [/\+234\d{10}/g, /0\d{10}/g, /\d{11}/g];

    const phones: string[] = [];
    for (const pattern of phonePatterns) {
      const matches = message.match(pattern);
      if (matches) {
        phones.push(...matches);
      }
    }
    return phones;
  }

  /**
   * Extract transaction-specific filters
   */
  private extractTransactionFilters(message: string): Record<string, any> {
    const filters: Record<string, any> = {};
    const lowerMessage = message.toLowerCase();

    // Transaction status
    if (lowerMessage.includes('completed')) filters.status = 'COMPLETED';
    if (lowerMessage.includes('pending')) filters.status = 'PENDING';
    if (lowerMessage.includes('failed')) filters.status = 'FAILED';

    // Transaction type
    if (lowerMessage.includes('transfer')) filters.type = 'TRANSFER';
    if (lowerMessage.includes('deposit')) filters.type = 'DEPOSIT';
    if (lowerMessage.includes('withdrawal')) filters.type = 'WITHDRAWAL';

    return filters;
  }

  /**
   * Extract wallet operation type
   */
  private extractWalletOperation(message: string): string | undefined {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('fund') ||
      lowerMessage.includes('credit') ||
      lowerMessage.includes('add money')
    ) {
      return 'FUND';
    }
    if (
      lowerMessage.includes('debit') ||
      lowerMessage.includes('withdraw') ||
      lowerMessage.includes('remove')
    ) {
      return 'DEBIT';
    }
    if (lowerMessage.includes('freeze') || lowerMessage.includes('lock')) {
      return 'FREEZE';
    }
    if (lowerMessage.includes('unfreeze') || lowerMessage.includes('unlock')) {
      return 'UNFREEZE';
    }
    if (lowerMessage.includes('balance') || lowerMessage.includes('check')) {
      return 'BALANCE_CHECK';
    }

    return undefined;
  }

  /**
   * Extract KYC-specific filters
   */
  private extractKycFilters(message: string): Record<string, any> {
    const filters: Record<string, any> = {};
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('pending')) filters.status = 'PENDING';
    if (lowerMessage.includes('approved')) filters.status = 'APPROVED';
    if (lowerMessage.includes('rejected')) filters.status = 'REJECTED';

    return filters;
  }

  /**
   * Extract analytics-specific filters
   */
  private extractAnalyticsFilters(message: string): Record<string, any> {
    const filters: Record<string, any> = {};
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('revenue')) filters.type = 'revenue';
    if (lowerMessage.includes('user growth')) filters.type = 'user_growth';
    if (lowerMessage.includes('transaction volume'))
      filters.type = 'transaction_volume';

    return filters;
  }

  /**
   * Extract admin-specific filters
   */
  private extractAdminFilters(message: string): Record<string, any> {
    const filters: Record<string, any> = {};
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('sudo')) filters.role = 'SUDO_ADMIN';
    if (lowerMessage.includes('admin')) filters.role = 'ADMIN';
    if (lowerMessage.includes('customer rep')) filters.role = 'CUSTOMER_REP';

    return filters;
  }

  /**
   * Extract fee-specific filters
   */
  private extractFeeFilters(message: string): Record<string, any> {
    const filters: Record<string, any> = {};
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('transfer')) filters.type = 'TRANSFER';
    if (lowerMessage.includes('deposit')) filters.type = 'DEPOSIT';
    if (lowerMessage.includes('withdrawal')) filters.type = 'WITHDRAWAL';

    return filters;
  }

  /**
   * Extract time frame from message
   */
  private extractTimeFrame(message: string): UserQuery['timeFrame'] {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('today')) {
      return { period: 'today' };
    }
    if (lowerMessage.includes('yesterday')) {
      return { period: 'yesterday' };
    }
    if (
      lowerMessage.includes('this week') ||
      lowerMessage.includes('last week')
    ) {
      return { period: 'week' };
    }
    if (
      lowerMessage.includes('this month') ||
      lowerMessage.includes('last month')
    ) {
      return { period: 'month' };
    }
    if (
      lowerMessage.includes('this year') ||
      lowerMessage.includes('last year')
    ) {
      return { period: 'year' };
    }

    // Enhanced custom date ranges with better parsing
    const dateRangeMatch = message.match(
      /(?:from|between)\s+([^,\s]+(?:\s+[^,\s]+)*)\s+(?:to|and)\s+([^,\s]+(?:\s+[^,\s]+)*)/i,
    );
    if (dateRangeMatch) {
      try {
        const startDate = this.parseNaturalDate(dateRangeMatch[1]);
        const endDate = this.parseNaturalDate(dateRangeMatch[2]);

        if (startDate && endDate) {
          return {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            period: 'custom',
          };
        }
      } catch (error) {
        this.logger.warn(
          `Failed to parse date range: ${dateRangeMatch[1]} to ${dateRangeMatch[2]}`,
        );
      }
    }

    return undefined;
  }

  /**
   * Extract user identifier from message
   */
  private extractUserIdentifier(
    message: string,
  ): { name?: string; email?: string } | null {
    // Email pattern
    const emailMatch = message.match(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
    );
    if (emailMatch) {
      return { email: emailMatch[0] };
    }

    // Name pattern (look for capitalized words that might be names)
    const nameMatch = message.match(
      /(?:for|of|user)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
    );
    if (nameMatch) {
      return { name: nameMatch[1] };
    }

    return null;
  }

  /**
   * Parse natural language dates
   */
  private parseNaturalDate(dateString: string): Date | null {
    try {
      const lowerDate = dateString.toLowerCase().trim();

      // Handle common date formats
      if (lowerDate.includes('july') || lowerDate.includes('jul')) {
        const dayMatch = lowerDate.match(/(\d+)(?:st|nd|rd|th)?/);
        if (dayMatch) {
          const day = parseInt(dayMatch[1]);
          const year = new Date().getFullYear();
          return new Date(year, 6, day); // July is month 6 (0-indexed)
        }
      }

      if (lowerDate.includes('june') || lowerDate.includes('jun')) {
        const dayMatch = lowerDate.match(/(\d+)(?:st|nd|rd|th)?/);
        if (dayMatch) {
          const day = parseInt(dayMatch[1]);
          const year = new Date().getFullYear();
          return new Date(year, 5, day); // June is month 5
        }
      }

      if (lowerDate.includes('august') || lowerDate.includes('aug')) {
        const dayMatch = lowerDate.match(/(\d+)(?:st|nd|rd|th)?/);
        if (dayMatch) {
          const day = parseInt(dayMatch[1]);
          const year = new Date().getFullYear();
          return new Date(year, 7, day); // August is month 7
        }
      }

      // Handle MM/DD format
      const mmddMatch = lowerDate.match(/(\d{1,2})\/(\d{1,2})/);
      if (mmddMatch) {
        const month = parseInt(mmddMatch[1]) - 1; // 0-indexed
        const day = parseInt(mmddMatch[2]);
        const year = new Date().getFullYear();
        return new Date(year, month, day);
      }

      // Handle YYYY-MM-DD format
      const isoMatch = lowerDate.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (isoMatch) {
        const year = parseInt(isoMatch[1]);
        const month = parseInt(isoMatch[2]) - 1;
        const day = parseInt(isoMatch[3]);
        return new Date(year, month, day);
      }

      // Try parsing as is
      const parsed = new Date(dateString);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }

      return null;
    } catch (error) {
      this.logger.warn(`Failed to parse date: ${dateString}`);
      return null;
    }
  }
}
