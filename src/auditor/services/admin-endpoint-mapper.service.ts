import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface AdminEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
  category: string;
  params?: string[];
  queryParams?: string[];
  bodyParams?: string[];
  requiresAuth: boolean;
  roles: string[];
  examples?: string[];
}

@Injectable()
export class AdminEndpointMapperService {
  private readonly logger = new Logger(AdminEndpointMapperService.name);
  private readonly baseUrl = 'http://localhost:3000';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Complete mapping of all admin endpoints
   */
  getAdminEndpoints(): AdminEndpoint[] {
    return [
      // ==================== USER MANAGEMENT ====================
      {
        path: '/admin/users',
        method: 'GET',
        description: 'Get all users with filtering and pagination',
        category: 'User Management',
        queryParams: ['page', 'limit', 'search', 'status', 'kycStatus', 'role'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN', 'CUSTOMER_REP'],
        examples: [
          'Get all users: /admin/users',
          'Search users: /admin/users?search=john',
          'Filter by KYC: /admin/users?kycStatus=APPROVED',
          'Paginate: /admin/users?page=1&limit=20'
        ]
      },
      {
        path: '/admin/users/:userId',
        method: 'GET',
        description: 'Get detailed user information including wallet, transactions, and KYC',
        category: 'User Management',
        params: ['userId'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN', 'CUSTOMER_REP'],
        examples: [
          'Get user details: /admin/users/user123',
          'View user profile with full transaction history'
        ]
      },
      {
        path: '/admin/users',
        method: 'DELETE',
        description: 'Delete a user account',
        category: 'User Management',
        bodyParams: ['userId', 'reason'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Delete user with reason']
      },
      {
        path: '/admin/edit-user',
        method: 'PUT',
        description: 'Edit user information',
        category: 'User Management',
        bodyParams: ['userId', 'firstName', 'lastName', 'email', 'phone'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Update user profile information']
      },

      // ==================== TRANSACTION MANAGEMENT ====================
      {
        path: '/admin/transactions',
        method: 'GET',
        description: 'Get all transactions with filtering and search',
        category: 'Transaction Management',
        queryParams: ['page', 'limit', 'search', 'status', 'type', 'userId', 'startDate', 'endDate'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN', 'CUSTOMER_REP'],
        examples: [
          'Get all transactions: /admin/transactions',
          'Filter by user: /admin/transactions?userId=user123',
          'Filter by date: /admin/transactions?startDate=2024-01-01&endDate=2024-12-31',
          'Filter by status: /admin/transactions?status=COMPLETED'
        ]
      },
      {
        path: '/admin/transactions/:transactionId',
        method: 'GET',
        description: 'Get detailed transaction information',
        category: 'Transaction Management',
        params: ['transactionId'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN', 'CUSTOMER_REP'],
        examples: ['Get transaction details: /admin/transactions/txn123']
      },

      // ==================== WALLET MANAGEMENT ====================
      {
        path: '/admin/wallet/balance',
        method: 'GET',
        description: 'Get wallet balance information',
        category: 'Wallet Management',
        queryParams: ['userId', 'walletId'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: [
          'Get user wallet balance: /admin/wallet/balance?userId=user123',
          'Get specific wallet: /admin/wallet/balance?walletId=wallet123'
        ]
      },
      {
        path: '/admin/wallet/total-balance',
        method: 'GET',
        description: 'Get total platform wallet balance',
        category: 'Wallet Management',
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Get total platform balance']
      },
      {
        path: '/admin/fund-wallet',
        method: 'POST',
        description: 'Fund a user wallet',
        category: 'Wallet Management',
        bodyParams: ['userId', 'amount', 'reason', 'reference'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Fund user wallet with amount and reason']
      },
      {
        path: '/admin/debit-wallet',
        method: 'POST',
        description: 'Debit a user wallet',
        category: 'Wallet Management',
        bodyParams: ['userId', 'amount', 'reason', 'reference'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Debit user wallet with amount and reason']
      },
      {
        path: '/admin/create-wallet',
        method: 'POST',
        description: 'Create a new wallet for user',
        category: 'Wallet Management',
        bodyParams: ['userId', 'walletType'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Create new wallet for user']
      },
      {
        path: '/admin/wallet/freeze',
        method: 'POST',
        description: 'Freeze a user wallet',
        category: 'Wallet Management',
        bodyParams: ['userId', 'reason'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Freeze wallet with reason']
      },
      {
        path: '/admin/wallet/unfreeze',
        method: 'POST',
        description: 'Unfreeze a user wallet',
        category: 'Wallet Management',
        bodyParams: ['userId', 'reason'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Unfreeze wallet with reason']
      },
      {
        path: '/admin/validate-wallet/:walletId',
        method: 'GET',
        description: 'Validate wallet integrity',
        category: 'Wallet Management',
        params: ['walletId'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Validate wallet: /admin/validate-wallet/wallet123']
      },
      {
        path: '/admin/reconcile-wallet/:walletId',
        method: 'POST',
        description: 'Reconcile wallet balance',
        category: 'Wallet Management',
        params: ['walletId'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Reconcile wallet: /admin/reconcile-wallet/wallet123']
      },
      {
        path: '/admin/validate-all-wallets',
        method: 'GET',
        description: 'Validate all wallet balances',
        category: 'Wallet Management',
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Validate all wallets in system']
      },
      {
        path: '/admin/reset-wallet/:walletId',
        method: 'POST',
        description: 'Reset wallet balance',
        category: 'Wallet Management',
        params: ['walletId'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Reset wallet: /admin/reset-wallet/wallet123']
      },

      // ==================== KYC MANAGEMENT ====================
      {
        path: '/admin/kyc/submissions',
        method: 'GET',
        description: 'Get all KYC submissions',
        category: 'KYC Management',
        queryParams: ['page', 'limit', 'status'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN', 'CUSTOMER_REP'],
        examples: [
          'Get all KYC: /admin/kyc/submissions',
          'Filter pending: /admin/kyc/submissions?status=PENDING'
        ]
      },
      {
        path: '/admin/kyc/submissions/pending',
        method: 'GET',
        description: 'Get pending KYC submissions',
        category: 'KYC Management',
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN', 'CUSTOMER_REP'],
        examples: ['Get pending KYC submissions']
      },
      {
        path: '/admin/kyc/submissions/:userId',
        method: 'GET',
        description: 'Get KYC submission for specific user',
        category: 'KYC Management',
        params: ['userId'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN', 'CUSTOMER_REP'],
        examples: ['Get user KYC: /admin/kyc/submissions/user123']
      },
      {
        path: '/admin/kyc/submissions/:userId/review',
        method: 'PUT',
        description: 'Review and approve/reject KYC submission',
        category: 'KYC Management',
        params: ['userId'],
        bodyParams: ['status', 'reviewNotes', 'reviewedBy'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Review KYC submission']
      },

      // ==================== DASHBOARD & ANALYTICS ====================
      {
        path: '/admin/dashboard/stats',
        method: 'GET',
        description: 'Get comprehensive dashboard statistics',
        category: 'Dashboard & Analytics',
        queryParams: ['period', 'startDate', 'endDate'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN', 'CUSTOMER_REP'],
        examples: [
          'Get dashboard stats: /admin/dashboard/stats',
          'Get stats for period: /admin/dashboard/stats?period=last_30_days'
        ]
      },

      // ==================== FEE MANAGEMENT ====================
      {
        path: '/admin/fees',
        method: 'GET',
        description: 'Get all fee configurations',
        category: 'Fee Management',
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Get all fee configurations']
      },
      {
        path: '/admin/fees/:type',
        method: 'GET',
        description: 'Get specific fee configuration',
        category: 'Fee Management',
        params: ['type'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Get fee config: /admin/fees/TRANSFER']
      },
      {
        path: '/admin/fees',
        method: 'POST',
        description: 'Set or update fee configuration',
        category: 'Fee Management',
        bodyParams: ['type', 'percentage', 'fixedAmount', 'minAmount', 'maxAmount'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Set fee configuration']
      },
      {
        path: '/admin/fees/:type',
        method: 'DELETE',
        description: 'Delete fee configuration',
        category: 'Fee Management',
        params: ['type'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Delete fee: /admin/fees/TRANSFER']
      },

      // ==================== PROVIDER MANAGEMENT ====================
      {
        path: '/admin/providers',
        method: 'GET',
        description: 'Get all payment providers',
        category: 'Provider Management',
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Get all providers: /admin/providers']
      },
      {
        path: '/admin/providers/switch',
        method: 'POST',
        description: 'Switch payment provider',
        category: 'Provider Management',
        bodyParams: ['provider', 'config'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Switch to new provider']
      },
      {
        path: '/admin/providers/current',
        method: 'GET',
        description: 'Get current payment provider',
        category: 'Provider Management',
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Get current provider']
      },
      {
        path: '/admin/transfer-providers',
        method: 'GET',
        description: 'Get all transfer providers',
        category: 'Provider Management',
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Get transfer providers']
      },
      {
        path: '/admin/transfer-providers/switch',
        method: 'POST',
        description: 'Switch transfer provider',
        category: 'Provider Management',
        bodyParams: ['provider', 'config'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Switch transfer provider']
      },
      {
        path: '/admin/transfer-providers/current',
        method: 'GET',
        description: 'Get current transfer provider',
        category: 'Provider Management',
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Get current transfer provider']
      },

      // ==================== TESTING ENDPOINTS ====================
      {
        path: '/admin/test-polaris-api',
        method: 'POST',
        description: 'Test Polaris API connection',
        category: 'Testing & Validation',
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN', 'DEVELOPER'],
        examples: ['Test Polaris API']
      },
      {
        path: '/admin/test-budpay-api',
        method: 'POST',
        description: 'Test BudPay API connection',
        category: 'Testing & Validation',
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN', 'DEVELOPER'],
        examples: ['Test BudPay API']
      },
      {
        path: '/admin/test-bank-list',
        method: 'GET',
        description: 'Test bank list retrieval',
        category: 'Testing & Validation',
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN', 'DEVELOPER'],
        examples: ['Test bank list API']
      },
      {
        path: '/admin/test-account-verification',
        method: 'POST',
        description: 'Test account verification',
        category: 'Testing & Validation',
        bodyParams: ['accountNumber', 'bankCode'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN', 'DEVELOPER'],
        examples: ['Test account verification']
      },
      {
        path: '/admin/test-bank-transfer',
        method: 'POST',
        description: 'Test bank transfer',
        category: 'Testing & Validation',
        bodyParams: ['amount', 'accountNumber', 'bankCode'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN', 'DEVELOPER'],
        examples: ['Test bank transfer']
      },

      // ==================== WALLET VALIDATION ====================
      {
        path: '/admin/validate-wallet/:walletId',
        method: 'GET',
        description: 'Validate wallet integrity',
        category: 'Wallet Management',
        params: ['walletId'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Validate wallet: /admin/validate-wallet/wallet123']
      },
      {
        path: '/admin/reconcile-wallet/:walletId',
        method: 'POST',
        description: 'Reconcile wallet balance',
        category: 'Wallet Management',
        params: ['walletId'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Reconcile wallet: /admin/reconcile-wallet/wallet123']
      },
      {
        path: '/admin/validate-all-wallets',
        method: 'GET',
        description: 'Validate all wallet balances',
        category: 'Wallet Management',
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Validate all wallets in system']
      },
      {
        path: '/admin/reset-wallet/:walletId',
        method: 'POST',
        description: 'Reset wallet balance',
        category: 'Wallet Management',
        params: ['walletId'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Reset wallet: /admin/reset-wallet/wallet123']
      },
      {
        path: '/admin/reset-wallet-by-account/:accountNumber',
        method: 'POST',
        description: 'Reset wallet by account number',
        category: 'Wallet Management',
        params: ['accountNumber'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Reset wallet by account: /admin/reset-wallet-by-account/1234567890']
      },

      // ==================== ADVANCED FEE MANAGEMENT ====================
      {
        path: '/admin/fee-configurations',
        method: 'GET',
        description: 'Get all fee configurations',
        category: 'Fee Management',
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Get fee configurations']
      },
      {
        path: '/admin/fee-configurations/:id',
        method: 'GET',
        description: 'Get specific fee configuration',
        category: 'Fee Management',
        params: ['id'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Get fee config: /admin/fee-configurations/config123']
      },
      {
        path: '/admin/fee-configurations',
        method: 'POST',
        description: 'Create fee configuration',
        category: 'Fee Management',
        bodyParams: ['name', 'type', 'percentage', 'fixedAmount'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Create fee configuration']
      },
      {
        path: '/admin/fee-configurations/:id',
        method: 'PUT',
        description: 'Update fee configuration',
        category: 'Fee Management',
        params: ['id'],
        bodyParams: ['name', 'type', 'percentage', 'fixedAmount'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Update fee configuration']
      },
      {
        path: '/admin/fee-configurations/:id',
        method: 'DELETE',
        description: 'Delete fee configuration',
        category: 'Fee Management',
        params: ['id'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Delete fee configuration']
      },
      {
        path: '/admin/funding-fees',
        method: 'GET',
        description: 'Get funding fee configurations',
        category: 'Fee Management',
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Get funding fees']
      },
      {
        path: '/admin/funding-fees/:provider',
        method: 'GET',
        description: 'Get funding fees for provider',
        category: 'Fee Management',
        params: ['provider'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Get provider funding fees']
      },
      {
        path: '/admin/funding-fees/:provider',
        method: 'POST',
        description: 'Set funding fees for provider',
        category: 'Fee Management',
        params: ['provider'],
        bodyParams: ['percentage', 'fixedAmount', 'minAmount', 'maxAmount'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Set provider funding fees']
      },

      // ==================== ROLES & PERMISSIONS ====================
      {
        path: '/admin/roles/permissions',
        method: 'GET',
        description: 'Get roles and permissions',
        category: 'Admin Management',
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Get roles and permissions']
      },
      {
        path: '/admin/logs',
        method: 'GET',
        description: 'Get admin activity logs',
        category: 'Admin Management',
        queryParams: ['page', 'limit', 'userId', 'action', 'startDate', 'endDate'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Get admin logs: /admin/logs']
      },

      // ==================== ADMIN MANAGEMENT ====================
      {
        path: '/admin/admins',
        method: 'GET',
        description: 'Get all admin users',
        category: 'Admin Management',
        queryParams: ['page', 'limit', 'role', 'status'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Get all admins: /admin/admins']
      },
      {
        path: '/admin/admins/:adminId',
        method: 'GET',
        description: 'Get specific admin details',
        category: 'Admin Management',
        params: ['adminId'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN', 'ADMIN'],
        examples: ['Get admin: /admin/admins/admin123']
      },
      {
        path: '/admin/create-admin',
        method: 'POST',
        description: 'Create new admin user',
        category: 'Admin Management',
        bodyParams: ['email', 'firstName', 'lastName', 'role', 'permissions'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN'],
        examples: ['Create new admin user']
      },
      {
        path: '/admin/admins/:adminId',
        method: 'PUT',
        description: 'Update admin user',
        category: 'Admin Management',
        params: ['adminId'],
        bodyParams: ['firstName', 'lastName', 'role', 'permissions', 'isActive'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN'],
        examples: ['Update admin user']
      },
      {
        path: '/admin/admins/:adminId',
        method: 'DELETE',
        description: 'Delete admin user',
        category: 'Admin Management',
        params: ['adminId'],
        requiresAuth: true,
        roles: ['SUDO_ADMIN'],
        examples: ['Delete admin user']
      }
    ];
  }

  /**
   * Find relevant endpoints based on query intent
   */
  findRelevantEndpoints(query: string, category?: string): AdminEndpoint[] {
    const endpoints = this.getAdminEndpoints();
    const lowerQuery = query.toLowerCase();

    return endpoints.filter(endpoint => {
      // Category filter
      if (category && endpoint.category !== category) return false;

      // Search in description, path, and examples
      const searchText = `${endpoint.description} ${endpoint.path} ${endpoint.examples?.join(' ') || ''}`.toLowerCase();
      
      // Check for keyword matches
      const keywords = lowerQuery.split(' ');
      return keywords.some(keyword => searchText.includes(keyword));
    });
  }

  /**
   * Get endpoint by exact path
   */
  getEndpointByPath(path: string, method: string = 'GET'): AdminEndpoint | null {
    const endpoints = this.getAdminEndpoints();
    return endpoints.find(endpoint => 
      endpoint.path === path && endpoint.method === method
    ) || null;
  }

  /**
   * Get endpoints by category
   */
  getEndpointsByCategory(category: string): AdminEndpoint[] {
    return this.getAdminEndpoints().filter(endpoint => endpoint.category === category);
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    const endpoints = this.getAdminEndpoints();
    return [...new Set(endpoints.map(endpoint => endpoint.category))];
  }

  /**
   * Execute admin API call (internal system access - no auth required)
   */
  async executeAdminCall(
    endpoint: AdminEndpoint,
    params: Record<string, any> = {},
    authToken?: string
  ): Promise<any> {
    try {
      let url = `${this.baseUrl}${endpoint.path}`;
      
      // Replace path parameters
      if (endpoint.params) {
        endpoint.params.forEach(param => {
          if (params[param]) {
            url = url.replace(`:${param}`, params[param]);
          }
        });
      }

      // Add query parameters
      if (endpoint.queryParams && endpoint.method === 'GET') {
        const queryParams = new URLSearchParams();
        endpoint.queryParams.forEach(param => {
          if (params[param] !== undefined) {
            queryParams.append(param, params[param]);
          }
        });
        if (queryParams.toString()) {
          url += `?${queryParams.toString()}`;
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Auditor-Service': 'internal-system', // Special header for auditor bypass
        'User-Agent': 'Auditor-Service/1.0 (Internal System Access)',
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      let response;
      
      switch (endpoint.method) {
        case 'GET':
          response = await firstValueFrom(
            this.httpService.get(url, { headers })
          );
          break;
        case 'POST':
          const postBody = endpoint.bodyParams ? 
            Object.fromEntries(
              endpoint.bodyParams
                .filter(param => params[param] !== undefined)
                .map(param => [param, params[param]])
            ) : params;
          response = await firstValueFrom(
            this.httpService.post(url, postBody, { headers })
          );
          break;
        case 'PUT':
          const putBody = endpoint.bodyParams ? 
            Object.fromEntries(
              endpoint.bodyParams
                .filter(param => params[param] !== undefined)
                .map(param => [param, params[param]])
            ) : params;
          response = await firstValueFrom(
            this.httpService.put(url, putBody, { headers })
          );
          break;
        case 'DELETE':
          response = await firstValueFrom(
            this.httpService.delete(url, { headers })
          );
          break;
        default:
          throw new Error(`Unsupported method: ${endpoint.method}`);
      }

      return response.data;
    } catch (error) {
      this.logger.error(`Error executing admin call to ${endpoint.path}:`, error);
      throw error;
    }
  }
}