import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserQuery } from './query-analyzer.service';
import { AdminEndpointMapperService, AdminEndpoint } from './admin-endpoint-mapper.service';

export interface QueryIntent {
  type: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  params?: Record<string, any>;
  body?: Record<string, any>;
  description: string;
  requiresAuth?: boolean;
  priority?: number;
  category?: string;
  confidence?: number;
  adminEndpoint?: AdminEndpoint;
}

export interface BackendResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

@Injectable()
export class QueryExecutorService {
  private readonly logger = new Logger(QueryExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminEndpointMapper: AdminEndpointMapperService,
  ) { }

  /**
   * Super smart query intent generation using admin endpoint mapping
   */
  generateQueryIntents(userQuery: UserQuery): QueryIntent[] {
    const intents: QueryIntent[] = [];
    this.logger.debug(`🧠 Generating smart intents for query type: ${userQuery.type}`);

    switch (userQuery.type) {
      case 'USER_LOOKUP':
        intents.push(...this.generateUserLookupIntents(userQuery));
        break;

      case 'TRANSACTION_HISTORY':
        intents.push(...this.generateTransactionIntents(userQuery));
        break;

      case 'WALLET_OPERATIONS':
        intents.push(...this.generateWalletIntents(userQuery));
        break;

      case 'KYC_MANAGEMENT':
        intents.push(...this.generateKycIntents(userQuery));
        break;

      case 'SYSTEM_STATUS':
        intents.push(...this.generateSystemStatusIntents(userQuery));
        break;

      case 'ANALYTICS':
        intents.push(...this.generateAnalyticsIntents(userQuery));
        break;

      case 'ADMIN_OPERATIONS':
        intents.push(...this.generateAdminIntents(userQuery));
        break;

      case 'FEE_MANAGEMENT':
        intents.push(...this.generateFeeIntents(userQuery));
        break;

      default:
        // Intelligent fallback - analyze suggested endpoints
        if (userQuery.suggestedEndpoints?.length > 0) {
          intents.push(...this.generateFromSuggestedEndpoints(userQuery));
        } else {
          intents.push(...this.generateDefaultIntents(userQuery));
        }
    }

    // Sort by priority and confidence
    return intents.sort((a, b) => {
      const priorityDiff = (a.priority || 10) - (b.priority || 10);
      if (priorityDiff !== 0) return priorityDiff;
      return (b.confidence || 0) - (a.confidence || 0);
    });
  }

  /**
   * Generate user lookup intents with comprehensive data fetching
   */
  private generateUserLookupIntents(userQuery: UserQuery): QueryIntent[] {
    const intents: QueryIntent[] = [];

    // Primary user search
    if (userQuery.userEmail) {
      const adminEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/users', 'GET');
      intents.push({
        type: 'GET',
        endpoint: '/admin/users',
        params: { search: userQuery.userEmail, limit: 10 },
        description: `Search for user by email: ${userQuery.userEmail}`,
        category: 'User Management',
        priority: 1,
        confidence: 0.95,
        adminEndpoint,
      });
    } else if (userQuery.userName) {
      const adminEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/users', 'GET');
      intents.push({
        type: 'GET',
        endpoint: '/admin/users',
        params: { search: userQuery.userName, limit: 10 },
        description: `Search for user by name: ${userQuery.userName}`,
        category: 'User Management',
        priority: 1,
        confidence: 0.9,
        adminEndpoint,
      });
    } else if (userQuery.userId) {
      const adminEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/users/:userId', 'GET');
      intents.push({
        type: 'GET',
        endpoint: `/admin/users/${userQuery.userId}`,
        description: `Get user details by ID: ${userQuery.userId}`,
        category: 'User Management',
        priority: 1,
        confidence: 0.98,
        adminEndpoint,
      });
    }

    // Additional context data
    if (userQuery.userEmail || userQuery.userName || userQuery.userId) {
      // Get KYC information
      const kycEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/kyc/submissions', 'GET');
      intents.push({
        type: 'GET',
        endpoint: '/admin/kyc/submissions',
        params: userQuery.userEmail ? { search: userQuery.userEmail } : {},
        description: 'Get user KYC status and documents',
        category: 'KYC Management',
        priority: 2,
        confidence: 0.8,
        adminEndpoint: kycEndpoint,
      });

      // Get recent transactions
      const transactionEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/transactions', 'GET');
      intents.push({
        type: 'GET',
        endpoint: '/admin/transactions',
        params: {
          ...(userQuery.userEmail && { search: userQuery.userEmail }),
          limit: 20,
          ...(userQuery.timeFrame && this.buildTimeFrameParams(userQuery.timeFrame))
        },
        description: 'Get user recent transactions',
        category: 'Transaction Management',
        priority: 3,
        confidence: 0.75,
        adminEndpoint: transactionEndpoint,
      });

      // Get wallet information
      const walletEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/wallet/balance', 'GET');
      intents.push({
        type: 'GET',
        endpoint: '/admin/wallet/balance',
        params: userQuery.userId ? { userId: userQuery.userId } : {},
        description: 'Get user wallet balance and status',
        category: 'Wallet Management',
        priority: 4,
        confidence: 0.7,
        adminEndpoint: walletEndpoint,
      });

      // Get additional user context data
      const logsEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/logs', 'GET');
      intents.push({
        type: 'GET',
        endpoint: '/admin/logs',
        params: { userId: userQuery.userId, limit: 10 },
        description: 'Get user activity logs',
        category: 'Admin Management',
        priority: 5,
        confidence: 0.6,
        adminEndpoint: logsEndpoint,
      });
    }

    return intents;
  }

  /**
   * Generate transaction-related intents
   */
  private generateTransactionIntents(userQuery: UserQuery): QueryIntent[] {
    const intents: QueryIntent[] = [];

    // Main transaction query
    const transactionParams: any = {
      limit: 50,
      ...userQuery.filters,
      ...(userQuery.timeFrame && this.buildTimeFrameParams(userQuery.timeFrame)),
    };

    if (userQuery.userEmail) {
      transactionParams.search = userQuery.userEmail;
    }
    if (userQuery.transactionId) {
      const transactionEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/transactions/:transactionId', 'GET');
      intents.push({
        type: 'GET',
        endpoint: `/admin/transactions/${userQuery.transactionId}`,
        description: `Get specific transaction: ${userQuery.transactionId}`,
        category: 'Transaction Management',
        priority: 1,
        confidence: 0.98,
        adminEndpoint: transactionEndpoint,
      });
    } else {
      const transactionEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/transactions', 'GET');
      intents.push({
        type: 'GET',
        endpoint: '/admin/transactions',
        params: transactionParams,
        description: 'Get filtered transaction history',
        category: 'Transaction Management',
        priority: 1,
        confidence: 0.9,
        adminEndpoint: transactionEndpoint,
      });
    }

    // If user specified, get user context
    if (userQuery.userEmail || userQuery.userName) {
      const userEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/users', 'GET');
      intents.push({
        type: 'GET',
        endpoint: '/admin/users',
        params: { search: userQuery.userEmail || userQuery.userName, limit: 5 },
        description: 'Get user context for transactions',
        category: 'User Management',
        priority: 2,
        confidence: 0.8,
        adminEndpoint: userEndpoint,
      });
    }

    return intents;
  }

  /**
   * Generate wallet operation intents
   */
  private generateWalletIntents(userQuery: UserQuery): QueryIntent[] {
    const intents: QueryIntent[] = [];
    const operation = userQuery.filters?.operation;

    switch (operation) {
      case 'BALANCE_CHECK':
        if (userQuery.userEmail || userQuery.userId) {
          const walletBalanceEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/wallet/balance', 'GET');
          intents.push({
            type: 'GET',
            endpoint: '/admin/wallet/balance',
            params: { userId: userQuery.userId },
            description: 'Check user wallet balance',
            category: 'Wallet Management',
            priority: 1,
            confidence: 0.95,
            adminEndpoint: walletBalanceEndpoint,
          });
        } else {
          const totalBalanceEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/wallet/total-balance', 'GET');
          intents.push({
            type: 'GET',
            endpoint: '/admin/wallet/total-balance',
            description: 'Get total platform wallet balance',
            category: 'Wallet Management',
            priority: 1,
            confidence: 0.9,
            adminEndpoint: totalBalanceEndpoint,
          });
        }
        break;

      case 'FUND':
      case 'DEBIT':
        // These require user identification first
        if (userQuery.userEmail || userQuery.userName) {
          const userEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/users', 'GET');
          intents.push({
            type: 'GET',
            endpoint: '/admin/users',
            params: { search: userQuery.userEmail || userQuery.userName, limit: 5 },
            description: 'Find user for wallet operation',
            category: 'User Management',
            priority: 1,
            confidence: 0.9,
            adminEndpoint: userEndpoint,
          });
        }
        break;

      case 'FREEZE':
      case 'UNFREEZE':
        if (userQuery.userEmail || userQuery.userName) {
          const userEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/users', 'GET');
          intents.push({
            type: 'GET',
            endpoint: '/admin/users',
            params: { search: userQuery.userEmail || userQuery.userName, limit: 5 },
            description: 'Find user for wallet freeze/unfreeze',
            category: 'User Management',
            priority: 1,
            confidence: 0.9,
            adminEndpoint: userEndpoint,
          });
        }
        break;

      default:
        // General wallet information
        const totalBalanceEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/wallet/total-balance', 'GET');
        intents.push({
          type: 'GET',
          endpoint: '/admin/wallet/total-balance',
          description: 'Get platform wallet overview',
          category: 'Wallet Management',
          priority: 1,
          confidence: 0.7,
          adminEndpoint: totalBalanceEndpoint,
        });
    }

    return intents;
  }

  /**
   * Generate KYC management intents
   */
  private generateKycIntents(userQuery: UserQuery): QueryIntent[] {
    const intents: QueryIntent[] = [];

    if (userQuery.userId || userQuery.userEmail) {
      const kycEndpoint = userQuery.userId
        ? this.adminEndpointMapper.getEndpointByPath('/admin/kyc/submissions/:userId', 'GET')
        : this.adminEndpointMapper.getEndpointByPath('/admin/kyc/submissions', 'GET');

      intents.push({
        type: 'GET',
        endpoint: userQuery.userId ? `/admin/kyc/submissions/${userQuery.userId}` : '/admin/kyc/submissions',
        params: userQuery.userEmail ? { search: userQuery.userEmail } : {},
        description: 'Get user KYC submission details',
        category: 'KYC Management',
        priority: 1,
        confidence: 0.95,
        adminEndpoint: kycEndpoint,
      });
    } else if (userQuery.filters?.status === 'PENDING') {
      const pendingKycEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/kyc/submissions/pending', 'GET');
      intents.push({
        type: 'GET',
        endpoint: '/admin/kyc/submissions/pending',
        description: 'Get all pending KYC submissions',
        category: 'KYC Management',
        priority: 1,
        confidence: 0.9,
        adminEndpoint: pendingKycEndpoint,
      });
    } else {
      const kycEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/kyc/submissions', 'GET');
      intents.push({
        type: 'GET',
        endpoint: '/admin/kyc/submissions',
        params: { limit: 50, ...userQuery.filters },
        description: 'Get KYC submissions with filters',
        category: 'KYC Management',
        priority: 1,
        confidence: 0.8,
        adminEndpoint: kycEndpoint,
      });
    }

    return intents;
  }

  /**
   * Generate system status intents
   */
  private generateSystemStatusIntents(userQuery: UserQuery): QueryIntent[] {
    const dashboardEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/dashboard/stats', 'GET');
    const walletBalanceEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/wallet/total-balance', 'GET');

    return [
      {
        type: 'GET',
        endpoint: '/admin/dashboard/stats',
        params: userQuery.timeFrame ? this.buildTimeFrameParams(userQuery.timeFrame) : {},
        description: 'Get comprehensive dashboard statistics',
        category: 'Dashboard & Analytics',
        priority: 1,
        confidence: 0.95,
        adminEndpoint: dashboardEndpoint,
      },
      {
        type: 'GET',
        endpoint: '/admin/wallet/total-balance',
        description: 'Get total platform wallet balance',
        category: 'Wallet Management',
        priority: 2,
        confidence: 0.9,
        adminEndpoint: walletBalanceEndpoint,
      },
      {
        type: 'GET',
        endpoint: '/admin/auditor/health',
        description: 'Get system health status',
        category: 'System Health',
        priority: 3,
        confidence: 0.85,
        // Note: This is an auditor endpoint, not admin, so no adminEndpoint mapping
      },
    ];
  }

  /**
   * Generate analytics intents
   */
  private generateAnalyticsIntents(userQuery: UserQuery): QueryIntent[] {
    const intents: QueryIntent[] = [];
    const timeParams = userQuery.timeFrame ? this.buildTimeFrameParams(userQuery.timeFrame) : {};

    const dashboardEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/dashboard/stats', 'GET');
    const transactionEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/transactions', 'GET');
    const userEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/users', 'GET');

    intents.push(
      {
        type: 'GET',
        endpoint: '/admin/dashboard/stats',
        params: timeParams,
        description: 'Get dashboard analytics',
        category: 'Dashboard & Analytics',
        priority: 1,
        confidence: 0.9,
        adminEndpoint: dashboardEndpoint,
      },
      {
        type: 'GET',
        endpoint: '/admin/transactions',
        params: { ...timeParams, limit: 100 },
        description: 'Get transaction data for analysis',
        category: 'Transaction Management',
        priority: 2,
        confidence: 0.85,
        adminEndpoint: transactionEndpoint,
      },
      {
        type: 'GET',
        endpoint: '/admin/users',
        params: { ...timeParams, limit: 100 },
        description: 'Get user data for analysis',
        category: 'User Management',
        priority: 3,
        confidence: 0.8,
        adminEndpoint: userEndpoint,
      }
    );

    return intents;
  }

  /**
   * Generate admin operation intents
   */
  private generateAdminIntents(userQuery: UserQuery): QueryIntent[] {
    const intents: QueryIntent[] = [];

    // Check if this is a logs-specific query by looking at suggested endpoints
    if (userQuery.suggestedEndpoints?.includes('/admin/logs')) {

      const logsEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/logs', 'GET');
      intents.push({
        type: 'GET',
        endpoint: '/admin/logs',
        params: { ...userQuery.filters, limit: 50 },
        description: 'Get admin activity logs',
        category: 'Admin Management',
        priority: 1,
        confidence: 0.95,
        adminEndpoint: logsEndpoint,
      });
    } else if (userQuery.adminId) {
      const adminEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/admins/:adminId', 'GET');
      intents.push({
        type: 'GET',
        endpoint: `/admin/admins/${userQuery.adminId}`,
        description: `Get admin details: ${userQuery.adminId}`,
        category: 'Admin Management',
        priority: 1,
        confidence: 0.95,
        adminEndpoint,
      });
    } else {
      const adminEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/admins', 'GET');
      intents.push({
        type: 'GET',
        endpoint: '/admin/admins',
        params: { ...userQuery.filters, limit: 50 },
        description: 'Get admin users list',
        category: 'Admin Management',
        priority: 1,
        confidence: 0.9,
        adminEndpoint,
      });
    }

    return intents;
  }

  /**
   * Generate fee management intents
   */
  private generateFeeIntents(userQuery: UserQuery): QueryIntent[] {
    const intents: QueryIntent[] = [];

    if (userQuery.filters?.type) {
      const feeEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/fees/:type', 'GET');
      intents.push({
        type: 'GET',
        endpoint: `/admin/fees/${userQuery.filters.type}`,
        description: `Get ${userQuery.filters.type} fee configuration`,
        category: 'Fee Management',
        priority: 1,
        confidence: 0.95,
        adminEndpoint: feeEndpoint,
      });
    } else {
      const feeEndpoint = this.adminEndpointMapper.getEndpointByPath('/admin/fees', 'GET');
      intents.push({
        type: 'GET',
        endpoint: '/admin/fees',
        description: 'Get all fee configurations',
        category: 'Fee Management',
        priority: 1,
        confidence: 0.9,
        adminEndpoint: feeEndpoint,
      });
    }

    return intents;
  }

  /**
   * Generate intents from suggested endpoints
   */
  private generateFromSuggestedEndpoints(userQuery: UserQuery): QueryIntent[] {
    const intents: QueryIntent[] = [];

    userQuery.suggestedEndpoints?.forEach((endpointPath, index) => {
      const adminEndpoint = this.adminEndpointMapper.getEndpointByPath(endpointPath);
      if (adminEndpoint) {
        intents.push({
          type: adminEndpoint.method,
          endpoint: endpointPath,
          description: adminEndpoint.description,
          category: adminEndpoint.category,
          priority: index + 1,
          confidence: userQuery.confidence || 0.7,
          adminEndpoint,
        });
      }
    });

    return intents;
  }

  /**
   * Generate default intents for general queries
   */
  private generateDefaultIntents(userQuery: UserQuery): QueryIntent[] {
    return [
      {
        type: 'GET',
        endpoint: '/admin/dashboard/stats',
        description: 'Get general system information',
        category: 'Dashboard & Analytics',
        priority: 1,
        confidence: 0.6,
      },
    ];
  }

  /**
   * Execute backend queries using real admin endpoints
   */
  async executeBackendQueries(intents: QueryIntent[]): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    for (const intent of intents) {
      try {
        this.logger.debug(`🔍 Executing query: ${intent.description}`);

        // Try to use real admin endpoint first
        let result;
        if (intent.adminEndpoint) {
          result = await this.executeRealAdminCall(intent);
        } else {
          // Fallback to simulation for non-admin endpoints
          result = await this.simulateBackendCall(intent);
        }

        results[intent.endpoint] = result;

        this.logger.debug(`✅ Query completed: ${intent.description}`);
      } catch (error) {
        this.logger.error(`❌ Query failed: ${intent.description}`, error);
        results[intent.endpoint] = {
          success: false,
          error: error.message,
        };
      }
    }

    return results;
  }

  /**
   * Execute real admin API calls with internal service access
   */
  private async executeRealAdminCall(intent: QueryIntent): Promise<BackendResponse> {
    try {
      if (!intent.adminEndpoint) {
        throw new Error('No admin endpoint configuration found');
      }

      // Use direct database calls for better performance and security
      const result = await this.executeInternalServiceCall(intent);

      return {
        success: true,
        data: result.data || result,
        message: result.message || 'Request completed successfully',
      };
    } catch (error) {
      this.logger.error(`Error executing internal service call: ${error.message}`);

      // Fallback to HTTP call with special headers
      try {
        const httpResult = await this.adminEndpointMapper.executeAdminCall(
          intent.adminEndpoint,
          intent.params || {},
          undefined // No auth token - using internal headers
        );

        return {
          success: true,
          data: httpResult.data || httpResult,
          message: httpResult.message || 'Request completed successfully',
        };
      } catch (httpError) {
        this.logger.error(`HTTP fallback also failed: ${httpError.message}`);
        return {
          success: false,
          error: `Internal call failed: ${error.message}, HTTP fallback failed: ${httpError.message}`,
        };
      }
    }
  }

  /**
   * Execute internal service calls directly (bypassing HTTP/auth)
   */
  private async executeInternalServiceCall(intent: QueryIntent): Promise<BackendResponse> {
    const endpoint = intent.endpoint;
    const params = intent.params || {};

    // Direct database calls for better performance
    switch (endpoint) {
      case '/admin/users':
        return await this.getUsers(params);
      case '/admin/transactions':
        return await this.getTransactions(params);
      case '/admin/dashboard/stats':
        return await this.getDashboardStats();
      case '/admin/wallet/total-balance':
        return await this.getTotalBalance();
      case '/admin/wallet/balance':
        return await this.getWalletBalance(params);
      case '/admin/kyc/submissions':
        return await this.getKycSubmissions(params);
      case '/admin/kyc/submissions/pending':
        return await this.getPendingKycSubmissions();
      case '/admin/admins':
        return await this.getAdmins(params);
      case '/admin/fees':
        return await this.getFees(params);
      case '/admin/logs':
        return await this.getAdminLogs(params);
      default:
        // For endpoints we haven't implemented direct calls, fall back to HTTP
        throw new Error(`Direct service call not implemented for ${endpoint}`);
    }
  }

  /**
   * Get users with search and filtering
   */
  private async getUsers(params: any): Promise<BackendResponse> {
    try {
      let whereClause: any = {};

      if (params.search) {
        whereClause.OR = [
          { email: { contains: params.search, mode: 'insensitive' } },
          { firstName: { contains: params.search, mode: 'insensitive' } },
          { lastName: { contains: params.search, mode: 'insensitive' } },
        ];
      }

      if (params.status) {
        whereClause.isActive = params.status === 'ACTIVE';
      }

      if (params.kycStatus) {
        whereClause.kycStatus = params.kycStatus;
      }

      const users = await this.prisma.user.findMany({
        where: whereClause,
        include: {
          wallet: true,
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
        take: params.limit || 50,
        skip: params.page ? (params.page - 1) * (params.limit || 50) : 0,
      });

      return {
        success: true,
        data: { users },
        message: `Found ${users.length} user(s)`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get wallet balance information
   */
  private async getWalletBalance(params: any): Promise<BackendResponse> {
    try {
      let whereClause: any = {};

      if (params.userId) {
        whereClause.userId = params.userId;
      }

      if (params.walletId) {
        whereClause.id = params.walletId;
      }

      const wallets = await this.prisma.wallet.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        take: params.limit || 10,
      });

      return {
        success: true,
        data: { wallets },
        message: `Found ${wallets.length} wallet(s)`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get KYC submissions
   */
  private async getKycSubmissions(params: any): Promise<BackendResponse> {
    try {
      let whereClause: any = {};

      if (params.status) {
        whereClause.status = params.status;
      }

      if (params.search) {
        whereClause.user = {
          OR: [
            { email: { contains: params.search, mode: 'insensitive' } },
            { firstName: { contains: params.search, mode: 'insensitive' } },
            { lastName: { contains: params.search, mode: 'insensitive' } },
          ],
        };
      }

      // Use user table since there's no separate KYC submission table
      const users = await this.prisma.user.findMany({
        where: {
          kycStatus: params.status || undefined,
          ...(params.search && {
            OR: [
              { email: { contains: params.search, mode: 'insensitive' } },
              { firstName: { contains: params.search, mode: 'insensitive' } },
              { lastName: { contains: params.search, mode: 'insensitive' } },
            ],
          }),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          kycStatus: true,
          kycVerifiedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: params.limit || 50,
      });

      // Transform users to look like KYC submissions
      const submissions = users.map(user => ({
        id: user.id,
        userId: user.id,
        status: user.kycStatus,
        submittedAt: user.createdAt,
        reviewedAt: user.kycVerifiedAt,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      }));

      return {
        success: true,
        data: { submissions },
        message: `Found ${submissions.length} KYC submission(s)`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get pending KYC submissions
   */
  private async getPendingKycSubmissions(): Promise<BackendResponse> {
    return await this.getKycSubmissions({ status: 'PENDING' });
  }

  /**
   * Get admin users
   */
  private async getAdmins(params: any): Promise<BackendResponse> {
    try {
      let whereClause: any = {
        role: { in: ['ADMIN', 'SUDO_ADMIN', 'CUSTOMER_REP'] },
      };

      if (params.role) {
        whereClause.role = params.role;
      }

      if (params.status) {
        whereClause.isActive = params.status === 'ACTIVE';
      }

      const admins = await this.prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: params.limit || 50,
      });

      return {
        success: true,
        data: { admins },
        message: `Found ${admins.length} admin(s)`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get fee configurations
   */
  private async getFees(params: any): Promise<BackendResponse> {
    try {
      let whereClause: any = {};

      if (params.type) {
        whereClause.type = params.type;
      }

      const fees = await this.prisma.feeConfiguration.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: params.limit || 50,
      });

      return {
        success: true,
        data: { fees },
        message: `Found ${fees.length} fee configuration(s)`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get admin activity logs
   */
  private async getAdminLogs(params: any): Promise<BackendResponse> {
    try {
      let whereClause: any = {};

      if (params.userId) {
        whereClause.adminId = params.userId;
      }

      if (params.action) {
        whereClause.action = { contains: params.action, mode: 'insensitive' };
      }

      if (params.startDate && params.endDate) {
        whereClause.createdAt = {
          gte: new Date(params.startDate),
          lte: new Date(params.endDate),
        };
      }

      const logs = await this.prisma.adminActionLog.findMany({
        where: whereClause,
        include: {
          admin: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: params.limit || 50,
        skip: params.page ? (params.page - 1) * (params.limit || 50) : 0,
      });

      return {
        success: true,
        data: { logs },
        message: `Found ${logs.length} admin log(s)`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Build time frame parameters for API calls
   */
  private buildTimeFrameParams(timeFrame: UserQuery['timeFrame']): Record<string, any> {
    if (!timeFrame) return {};

    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (timeFrame.period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case 'custom':
        startDate = timeFrame.start ? new Date(timeFrame.start) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = timeFrame.end ? new Date(timeFrame.end) : now;
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }

  /**
   * Simulate backend API calls (replace with actual HTTP calls in production)
   */
  private async simulateBackendCall(intent: QueryIntent): Promise<BackendResponse> {
    switch (intent.endpoint) {
      case '/admin/users/search':
        return await this.searchUsers(intent.params);
      case '/admin/transactions':
        return await this.getTransactions(intent.params);
      case '/admin/dashboard/stats':
        return await this.getDashboardStats();
      case '/admin/wallet/total-balance':
        return await this.getTotalBalance();
      case '/admin/auditor/health':
        return await this.getSystemHealth();
      default:
        return {
          success: false,
          error: 'Unknown endpoint',
        };
    }
  }

  /**
   * Search users by email or name
   */
  private async searchUsers(params: any): Promise<BackendResponse> {
    try {
      let whereClause: any = {};

      if (params.email) {
        whereClause.email = { contains: params.email, mode: 'insensitive' };
      } else if (params.name) {
        whereClause.OR = [
          { firstName: { contains: params.name, mode: 'insensitive' } },
          { lastName: { contains: params.name, mode: 'insensitive' } },
        ];
      }

      const users = await this.prisma.user.findMany({
        where: whereClause,
        include: {
          wallet: true,
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      return {
        success: true,
        data: { users },
        message: `Found ${users.length} user(s)`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get transactions with filters
   */
  private async getTransactions(params: any): Promise<BackendResponse> {
    try {
      let whereClause: any = {};

      if (params.startDate && params.endDate) {
        whereClause.createdAt = {
          gte: new Date(params.startDate),
          lte: new Date(params.endDate),
        };
      }

      const transactions = await this.prisma.transaction.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: params.limit || 50,
      });

      return {
        success: true,
        data: { transactions },
        message: `Found ${transactions.length} transaction(s)`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get dashboard statistics
   */
  private async getDashboardStats(): Promise<BackendResponse> {
    try {
      const [userCount, transactionCount, walletCount] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.transaction.count(),
        this.prisma.wallet.count(),
      ]);

      return {
        success: true,
        data: {
          users: userCount,
          transactions: transactionCount,
          wallets: walletCount,
        },
        message: 'Dashboard statistics retrieved',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get total wallet balance
   */
  private async getTotalBalance(): Promise<BackendResponse> {
    try {
      const wallets = await this.prisma.wallet.findMany({
        select: { balance: true },
      });

      const totalBalance = wallets.reduce((sum, wallet) => sum + (wallet.balance || 0), 0);

      return {
        success: true,
        data: { totalBalance },
        message: 'Total balance calculated',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get system health
   */
  private async getSystemHealth(): Promise<BackendResponse> {
    try {
      // Mock health check - in production, this would check actual services
      const health = {
        available: true,
        model: 'gemini-1.5-flash',
        latency: Math.random() * 1000 + 500, // Random latency between 500-1500ms
      };

      return {
        success: true,
        data: health,
        message: 'System health check completed',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
} 