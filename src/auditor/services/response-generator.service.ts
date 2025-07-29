import { Injectable, Logger } from '@nestjs/common';
import { UserQuery } from './query-analyzer.service';
import { AdminEndpointMapperService } from './admin-endpoint-mapper.service';

@Injectable()
export class ResponseGeneratorService {
  private readonly logger = new Logger(ResponseGeneratorService.name);

  constructor(
    private readonly adminEndpointMapper: AdminEndpointMapperService,
  ) {}

  /**
   * Generate super smart, comprehensive response with intelligent suggestions
   */
  generateComprehensiveResponse(
    originalMessage: string,
    userQuery: UserQuery,
    backendData: Record<string, any>,
    context?: any,
  ): string {
    // Extract relevant data from backend responses with proper key handling
    const usersData = this.extractDataFromResponse(
      backendData['/admin/users/search'],
      ['users', 'data'],
    );
    const transactionsData = this.extractDataFromResponse(
      backendData['/admin/transactions'],
      ['transactions', 'data'],
    );
    const dashboardStats = this.extractDataFromResponse(
      backendData['/admin/dashboard/stats'],
      ['data', 'stats'],
    );
    const balanceData = this.extractDataFromResponse(
      backendData['/admin/wallet/total-balance'],
      ['data'],
    );
    const healthData = this.extractDataFromResponse(
      backendData['/admin/auditor/health'],
      ['data'],
    );

    const users = Array.isArray(usersData) ? usersData : [];
    const transactions = Array.isArray(transactionsData)
      ? transactionsData
      : [];
    const totalBalance = balanceData?.totalBalance;
    const auditorHealth = healthData;

    // Extract all possible data types from backend responses
    const allData = this.extractAllDataFromBackend(backendData);

    // Generate super smart, context-aware response with intelligent suggestions
    let response = '';

    switch (userQuery.type) {
      case 'USER_LOOKUP':
        response = this.generateUserLookupResponse(
          allData,
          userQuery,
          originalMessage,
        );
        break;
      case 'TRANSACTION_HISTORY':
        response = this.generateTransactionHistoryResponse(
          allData,
          userQuery,
          originalMessage,
        );
        break;
      case 'WALLET_OPERATIONS':
        response = this.generateWalletOperationsResponse(
          allData,
          userQuery,
          originalMessage,
        );
        break;
      case 'KYC_MANAGEMENT':
        response = this.generateKycManagementResponse(
          allData,
          userQuery,
          originalMessage,
        );
        break;
      case 'SYSTEM_STATUS':
        response = this.generateSystemStatusResponse(
          allData,
          userQuery,
          originalMessage,
        );
        break;
      case 'ANALYTICS':
        response = this.generateAnalyticsResponse(
          allData,
          userQuery,
          originalMessage,
        );
        break;
      case 'ADMIN_OPERATIONS':
        response = this.generateAdminOperationsResponse(
          allData,
          userQuery,
          originalMessage,
        );
        break;
      case 'FEE_MANAGEMENT':
        response = this.generateFeeManagementResponse(
          allData,
          userQuery,
          originalMessage,
        );
        break;
      case 'GENERAL_QUERY':
        response = this.generateGeneralQueryResponse(
          allData,
          userQuery,
          originalMessage,
        );
        break;
      default:
        response = this.generateHelpResponse(userQuery);
    }

    // Add intelligent next actions and suggestions
    response += this.generateSmartSuggestions(
      userQuery,
      allData,
      originalMessage,
    );

    return response;
  }

  /**
   * Format transaction list for display
   */
  private formatTransactionList(transactions: any[]): string {
    let result = '';

    transactions.forEach((tx, index) => {
      const date = new Date(tx.createdAt).toLocaleDateString();
      const statusEmoji =
        tx.status === 'COMPLETED' ? '✅' : tx.status === 'FAILED' ? '❌' : '⏳';
      const typeEmoji = tx.type === 'DEPOSIT' ? '⬇️' : '⬆️';

      result += `${typeEmoji} **₦${tx.amount}** ${statusEmoji} (${date})\n`;
      result += `   ${tx.description || 'No description'}\n`;

      if (index < transactions.length - 1) {
        result += `\n`;
      }
    });

    return result;
  }

  /**
   * Extract all data from backend responses
   */
  private extractAllDataFromBackend(backendData: Record<string, any>): any {
    const allData: any = {
      users: [],
      transactions: [],
      dashboardStats: null,
      totalBalance: null,
      auditorHealth: null,
      kycSubmissions: [],
      admins: [],
      fees: [],
      walletBalance: null,
    };

    // Extract data from all possible endpoints
    Object.keys(backendData).forEach((endpoint) => {
      const response = backendData[endpoint];
      if (!response || !response.success) return;

      if (endpoint.includes('/admin/users')) {
        const users = this.extractDataFromResponse(response, ['users', 'data']);
        if (Array.isArray(users)) {
          allData.users.push(...users);
        } else if (users) {
          allData.users.push(users);
        }
      } else if (endpoint.includes('/admin/transactions')) {
        const transactions = this.extractDataFromResponse(response, [
          'transactions',
          'data',
        ]);
        if (Array.isArray(transactions)) {
          allData.transactions.push(...transactions);
        }
      } else if (endpoint.includes('/admin/dashboard/stats')) {
        allData.dashboardStats = this.extractDataFromResponse(response, [
          'data',
          'stats',
        ]);
      } else if (endpoint.includes('/admin/wallet/total-balance')) {
        const balanceData = this.extractDataFromResponse(response, ['data']);
        allData.totalBalance = balanceData?.totalBalance;
      } else if (endpoint.includes('/admin/auditor/health')) {
        allData.auditorHealth = this.extractDataFromResponse(response, [
          'data',
        ]);
      } else if (endpoint.includes('/admin/kyc/submissions')) {
        const kyc = this.extractDataFromResponse(response, [
          'submissions',
          'data',
        ]);
        if (Array.isArray(kyc)) {
          allData.kycSubmissions.push(...kyc);
        }
      } else if (endpoint.includes('/admin/admins')) {
        const admins = this.extractDataFromResponse(response, [
          'admins',
          'data',
        ]);
        if (Array.isArray(admins)) {
          allData.admins.push(...admins);
        }
      } else if (endpoint.includes('/admin/fees')) {
        const fees = this.extractDataFromResponse(response, ['fees', 'data']);
        if (Array.isArray(fees)) {
          allData.fees.push(...fees);
        }
      } else if (endpoint.includes('/admin/wallet/balance')) {
        allData.walletBalance = this.extractDataFromResponse(response, [
          'data',
        ]);
      }
    });

    return allData;
  }

  /**
   * Enhanced user lookup response with smart suggestions
   */
  private generateUserLookupResponse(
    allData: any,
    userQuery: UserQuery,
    originalMessage: string,
  ): string {
    const users = allData.users || [];

    if (users.length === 0) {
      const searchTerm =
        userQuery.userEmail || userQuery.userName || 'that user';
      return (
        `🤔 I couldn't find any user matching "${searchTerm}".\n\n` +
        `**💡 Smart Suggestions:**\n` +
        `• Double-check the spelling\n` +
        `• Try searching with their email address\n` +
        `• Try their full name (e.g., "John Doe")\n` +
        `• Ask me to "show all users" to browse\n\n` +
        `**🔍 What I can help you find:**\n` +
        `• User profiles and account details\n` +
        `• KYC status and verification info\n` +
        `• Wallet balances and transaction history\n` +
        `• Account activity and status`
      );
    }

    const user = users[0];
    let response = `👋 **Found User: ${user.firstName || user.email}**\n\n`;

    // Basic Info
    response += `📋 **Account Details:**\n`;
    response += `• **Email:** ${user.email}\n`;
    if (user.firstName || user.lastName) {
      response += `• **Name:** ${user.firstName || ''} ${user.lastName || ''}\n`;
    }
    response += `• **Phone:** ${user.phone || 'Not provided'}\n`;
    response += `• **KYC Status:** ${this.getKycStatusWithEmoji(user.kycStatus)}\n`;
    response += `• **Account Status:** ${user.isActive ? '✅ Active' : '❌ Inactive'}\n`;
    response += `• **Joined:** ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}\n\n`;

    // Wallet Info
    response += `💰 **Wallet Information:**\n`;
    if (user.wallet) {
      response += `• **Balance:** ₦${(user.wallet.balance || 0).toLocaleString()}\n`;
      response += `• **Status:** ${user.wallet.isActive ? '✅ Active' : '❌ Inactive'}\n`;
      response += `• **Account Number:** ${user.wallet.accountNumber || 'N/A'}\n`;
    } else {
      response += `• **Balance:** ₦${(user.walletBalance || 0).toLocaleString()}\n`;
      response += `• **Status:** ${user.walletStatus || 'Unknown'}\n`;
    }

    // Recent Activity
    const userTransactions = allData.transactions.filter(
      (tx: any) => tx.userId === user.id,
    );
    if (userTransactions.length > 0) {
      response += `\n📈 **Recent Activity:** ${userTransactions.length} transactions\n`;
      response += `• **Last Transaction:** ${new Date(userTransactions[0].createdAt).toLocaleDateString()}\n`;
    }

    return response;
  }

  /**
   * Enhanced transaction history response
   */
  private generateTransactionHistoryResponse(
    allData: any,
    userQuery: UserQuery,
    originalMessage: string,
  ): string {
    const users = allData.users || [];
    const transactions = allData.transactions || [];

    let response = '';

    if (users.length > 0) {
      // User-specific transaction history
      const user = users[0];
      const userTxs = transactions.filter((tx: any) => tx.userId === user.id);

      response = `💳 **Transaction History for ${user.firstName || user.email}**\n\n`;

      if (userTxs.length === 0) {
        response += `🤷‍♂️ No transactions found for this user.\n\n`;
        response += `**💡 Possible reasons:**\n`;
        response += `• User hasn't made any transactions yet\n`;
        response += `• Try a different time range\n`;
        response += `• Check if the user account is active\n\n`;
        response += `**🔍 Try asking:**\n`;
        response += `• "show all transactions from this week"\n`;
        response += `• "what is the user's wallet status"\n`;
      } else {
        response += this.formatTransactionList(userTxs.slice(0, 10));
        response += `\n📊 **Summary:**\n`;
        response += `• **Total Transactions:** ${userTxs.length}\n`;
        response += `• **Successful:** ${userTxs.filter((tx: any) => tx.status === 'COMPLETED').length}\n`;
        response += `• **Failed:** ${userTxs.filter((tx: any) => tx.status === 'FAILED').length}\n`;

        const totalAmount = userTxs.reduce(
          (sum: number, tx: any) => sum + (tx.amount || 0),
          0,
        );
        response += `• **Total Volume:** ₦${totalAmount.toLocaleString()}\n`;

        if (userTxs.length > 10) {
          response += `\n*(Showing latest 10 of ${userTxs.length} transactions)*`;
        }
      }
    } else if (transactions.length > 0) {
      // General transaction history
      response = `📈 **Platform Transaction Overview**\n\n`;
      response += this.formatTransactionList(transactions.slice(0, 10));
      response += `\n📊 **Platform Summary:**\n`;
      response += `• **Total Transactions:** ${transactions.length}\n`;
      response += `• **Successful:** ${transactions.filter((tx: any) => tx.status === 'COMPLETED').length}\n`;
      response += `• **Failed:** ${transactions.filter((tx: any) => tx.status === 'FAILED').length}\n`;

      const totalVolume = transactions.reduce(
        (sum: number, tx: any) => sum + (tx.amount || 0),
        0,
      );
      response += `• **Total Volume:** ₦${totalVolume.toLocaleString()}\n`;
    } else {
      response = `🤔 No transactions found for your query.\n\n`;
      response += `**💡 Smart Suggestions:**\n`;
      response += `• Try a different time period (e.g., "last month")\n`;
      response += `• Ask for a specific user's transactions\n`;
      response += `• Check the overall system status\n`;
      response += `• Ask "show me all recent transactions"\n`;
    }

    return response;
  }

  /**
   * Generate wallet operations response
   */
  private generateWalletOperationsResponse(
    allData: any,
    userQuery: UserQuery,
    originalMessage: string,
  ): string {
    const operation = userQuery.filters?.operation;
    const users = allData.users || [];
    const walletBalance = allData.walletBalance;
    const totalBalance = allData.totalBalance;

    let response = `💰 **Wallet Operations**\n\n`;

    switch (operation) {
      case 'BALANCE_CHECK':
        if (users.length > 0) {
          const user = users[0];
          response += `**Balance for ${user.firstName || user.email}:**\n`;
          response += `• **Current Balance:** ₦${(user.wallet?.balance || user.walletBalance || 0).toLocaleString()}\n`;
          response += `• **Wallet Status:** ${user.wallet?.isActive ? '✅ Active' : '❌ Inactive'}\n`;
          response += `• **Account Number:** ${user.wallet?.accountNumber || 'N/A'}\n`;
        } else if (totalBalance !== null) {
          response += `**Platform Total Balance:** ₦${totalBalance.toLocaleString()}\n`;
          response += `• **All user wallets combined**\n`;
        }
        break;

      default:
        if (totalBalance !== null) {
          response += `**Platform Wallet Overview:**\n`;
          response += `• **Total Balance:** ₦${totalBalance.toLocaleString()}\n`;
          response += `• **Active Wallets:** ${allData.dashboardStats?.wallets || 'N/A'}\n`;
        }

        response += `\n**💡 Available Wallet Operations:**\n`;
        response += `• Check user balance: "check wallet balance for john@example.com"\n`;
        response += `• View total platform balance: "show total wallet balance"\n`;
        response += `• Fund user wallet: "fund wallet for user@example.com"\n`;
        response += `• Check wallet status: "wallet status for John Doe"\n`;
    }

    return response;
  }

  /**
   * Generate KYC management response
   */
  private generateKycManagementResponse(
    allData: any,
    userQuery: UserQuery,
    originalMessage: string,
  ): string {
    const kycSubmissions = allData.kycSubmissions || [];
    const users = allData.users || [];

    let response = `📋 **KYC Management**\n\n`;

    if (users.length > 0) {
      const user = users[0];
      response += `**KYC Status for ${user.firstName || user.email}:**\n`;
      response += `• **Status:** ${this.getKycStatusWithEmoji(user.kycStatus)}\n`;
      response += `• **Submitted:** ${user.kycSubmittedAt ? new Date(user.kycSubmittedAt).toLocaleDateString() : 'Not submitted'}\n`;
      response += `• **Reviewed:** ${user.kycReviewedAt ? new Date(user.kycReviewedAt).toLocaleDateString() : 'Pending review'}\n`;
    } else if (kycSubmissions.length > 0) {
      response += `**KYC Submissions Overview:**\n`;
      const pending = kycSubmissions.filter(
        (kyc: any) => kyc.status === 'PENDING',
      ).length;
      const approved = kycSubmissions.filter(
        (kyc: any) => kyc.status === 'APPROVED',
      ).length;
      const rejected = kycSubmissions.filter(
        (kyc: any) => kyc.status === 'REJECTED',
      ).length;

      response += `• **Total Submissions:** ${kycSubmissions.length}\n`;
      response += `• **⏳ Pending:** ${pending}\n`;
      response += `• **✅ Approved:** ${approved}\n`;
      response += `• **❌ Rejected:** ${rejected}\n`;
    } else {
      response += `No KYC data found for your query.\n\n`;
      response += `**💡 Try asking:**\n`;
      response += `• "show pending KYC submissions"\n`;
      response += `• "KYC status for john@example.com"\n`;
      response += `• "show all KYC submissions"\n`;
    }

    return response;
  }

  /**
   * Enhanced system status response
   */
  private generateSystemStatusResponse(
    allData: any,
    userQuery: UserQuery,
    originalMessage: string,
  ): string {
    const dashboardStats = allData.dashboardStats;
    const totalBalance = allData.totalBalance;
    const auditorHealth = allData.auditorHealth;

    let response = `🚀 **Monzi Platform Status**\n\n`;

    // Core Metrics
    response += `📊 **Core Metrics:**\n`;
    if (dashboardStats) {
      response += `• **👥 Total Users:** ${(dashboardStats.users || 0).toLocaleString()}\n`;
      response += `• **💸 Total Transactions:** ${(dashboardStats.transactions || 0).toLocaleString()}\n`;
      response += `• **💰 Active Wallets:** ${(dashboardStats.wallets || 0).toLocaleString()}\n`;
    }

    if (totalBalance !== null) {
      response += `• **💵 Platform Balance:** ₦${totalBalance.toLocaleString()}\n`;
    }

    // System Health
    response += `\n🏥 **System Health:**\n`;
    if (auditorHealth) {
      response += `• **Status:** ${auditorHealth.available ? '✅ All Systems Operational' : '⚠️ Issues Detected'}\n`;
      response += `• **AI Assistant:** ${auditorHealth.model || 'Active'}\n`;
      if (auditorHealth.latency) {
        response += `• **Response Time:** ${Math.round(auditorHealth.latency)}ms\n`;
      }
    } else {
      response += `• **Status:** ✅ Systems Running Normally\n`;
    }

    // Quick Insights
    if (dashboardStats && allData.transactions.length > 0) {
      const recentTransactions = allData.transactions.slice(0, 10);
      const successRate =
        (recentTransactions.filter((tx: any) => tx.status === 'COMPLETED')
          .length /
          recentTransactions.length) *
        100;

      response += `\n📈 **Performance Insights:**\n`;
      response += `• **Transaction Success Rate:** ${Math.round(successRate)}%\n`;
      response += `• **Recent Activity:** ${recentTransactions.length} recent transactions\n`;
    }

    return response;
  }

  /**
   * Generate analytics response
   */
  private generateAnalyticsResponse(
    allData: any,
    userQuery: UserQuery,
    originalMessage: string,
  ): string {
    const dashboardStats = allData.dashboardStats;
    const transactions = allData.transactions || [];
    const users = allData.users || [];

    let response = `📊 **Analytics Dashboard**\n\n`;

    // Transaction Analytics
    if (transactions.length > 0) {
      response += `💸 **Transaction Analytics:**\n`;
      const totalVolume = transactions.reduce(
        (sum: number, tx: any) => sum + (tx.amount || 0),
        0,
      );
      const avgTransaction = totalVolume / transactions.length;
      const successRate =
        (transactions.filter((tx: any) => tx.status === 'COMPLETED').length /
          transactions.length) *
        100;

      response += `• **Total Volume:** ₦${totalVolume.toLocaleString()}\n`;
      response += `• **Average Transaction:** ₦${Math.round(avgTransaction).toLocaleString()}\n`;
      response += `• **Success Rate:** ${Math.round(successRate)}%\n`;
      response += `• **Total Count:** ${transactions.length.toLocaleString()}\n\n`;
    }

    // User Analytics
    if (users.length > 0) {
      response += `👥 **User Analytics:**\n`;
      const activeUsers = users.filter((user: any) => user.isActive).length;
      const verifiedUsers = users.filter(
        (user: any) => user.kycStatus === 'APPROVED',
      ).length;

      response += `• **Total Users:** ${users.length.toLocaleString()}\n`;
      response += `• **Active Users:** ${activeUsers.toLocaleString()}\n`;
      response += `• **Verified Users:** ${verifiedUsers.toLocaleString()}\n`;
      response += `• **Verification Rate:** ${Math.round((verifiedUsers / users.length) * 100)}%\n\n`;
    }

    // Platform Overview
    if (dashboardStats) {
      response += `🎯 **Platform Overview:**\n`;
      response += `• **Growth Trend:** ${this.calculateGrowthTrend(dashboardStats)}\n`;
      response += `• **System Utilization:** ${this.calculateUtilization(dashboardStats)}\n`;
    }

    return response;
  }

  /**
   * Generate admin operations response
   */
  private generateAdminOperationsResponse(
    allData: any,
    userQuery: UserQuery,
    originalMessage: string,
  ): string {
    const admins = allData.admins || [];

    let response = `👨‍💼 **Admin Management**\n\n`;

    if (admins.length > 0) {
      response += `**Admin Users Overview:**\n`;
      const activeAdmins = admins.filter((admin: any) => admin.isActive).length;
      const sudoAdmins = admins.filter(
        (admin: any) => admin.role === 'SUDO_ADMIN',
      ).length;

      response += `• **Total Admins:** ${admins.length}\n`;
      response += `• **Active Admins:** ${activeAdmins}\n`;
      response += `• **Sudo Admins:** ${sudoAdmins}\n`;
      response += `• **Regular Admins:** ${admins.length - sudoAdmins}\n\n`;

      response += `**Recent Admin Activity:**\n`;
      admins.slice(0, 5).forEach((admin: any, index: number) => {
        response += `${index + 1}. **${admin.firstName} ${admin.lastName}** (${admin.role})\n`;
        response += `   📧 ${admin.email} | ${admin.isActive ? '✅ Active' : '❌ Inactive'}\n`;
      });
    } else {
      response += `No admin data available.\n\n`;
      response += `**💡 Try asking:**\n`;
      response += `• "show all admin users"\n`;
      response += `• "admin user details for admin@example.com"\n`;
    }

    return response;
  }

  /**
   * Generate fee management response
   */
  private generateFeeManagementResponse(
    allData: any,
    userQuery: UserQuery,
    originalMessage: string,
  ): string {
    const fees = allData.fees || [];

    let response = `💰 **Fee Management**\n\n`;

    if (fees.length > 0) {
      response += `**Current Fee Configuration:**\n`;
      fees.forEach((fee: any) => {
        response += `• **${fee.type}:** `;
        if (fee.percentage) {
          response += `${fee.percentage}%`;
        }
        if (fee.fixedAmount) {
          response += `₦${fee.fixedAmount}`;
        }
        response += `\n`;
      });
    } else {
      response += `No fee configurations found.\n\n`;
      response += `**💡 Available fee operations:**\n`;
      response += `• "show all fee configurations"\n`;
      response += `• "transfer fee configuration"\n`;
      response += `• "set fee for deposits"\n`;
    }

    return response;
  }

  /**
   * Generate general query response
   */
  private generateGeneralQueryResponse(
    allData: any,
    userQuery: UserQuery,
    originalMessage: string,
  ): string {
    let response = `🤖 **I'm here to help!**\n\n`;

    response += `Based on your query "${originalMessage}", here's what I can help you with:\n\n`;

    response += `**🔍 What I can find:**\n`;
    response += `• User information and profiles\n`;
    response += `• Transaction history and details\n`;
    response += `• Wallet balances and operations\n`;
    response += `• KYC status and submissions\n`;
    response += `• System health and analytics\n`;
    response += `• Admin operations and management\n\n`;

    // Add relevant suggestions based on available data
    if (allData.users.length > 0) {
      response += `**👥 Recent Users:** Found ${allData.users.length} users in system\n`;
    }
    if (allData.transactions.length > 0) {
      response += `**💸 Recent Transactions:** ${allData.transactions.length} transactions available\n`;
    }

    return response;
  }

  /**
   * Generate help response
   */
  private generateHelpResponse(userQuery: UserQuery): string {
    return (
      `🤖 **Prime AI Assistant - Help**\n\n` +
      `I'm your intelligent assistant for the Monzi platform. Here's what I can help you with:\n\n` +
      `**👥 User Management:**\n` +
      `• "what is john@example.com" - Get user details\n` +
      `• "tell me about John Doe" - Find user by name\n` +
      `• "show user profile for user123" - Get user by ID\n\n` +
      `**💸 Transactions:**\n` +
      `• "show transactions for this week" - Get recent transactions\n` +
      `• "transaction history for john@example.com" - User transactions\n` +
      `• "failed transactions today" - Filter by status\n\n` +
      `**💰 Wallet Operations:**\n` +
      `• "check wallet balance for user@example.com" - User balance\n` +
      `• "total platform balance" - All wallets combined\n` +
      `• "freeze wallet for user@example.com" - Wallet operations\n\n` +
      `**📋 KYC Management:**\n` +
      `• "KYC status for user@example.com" - User verification\n` +
      `• "show pending KYC submissions" - Review queue\n` +
      `• "approved KYC submissions" - Filter by status\n\n` +
      `**📊 Analytics & Reports:**\n` +
      `• "system status" - Platform overview\n` +
      `• "dashboard metrics" - Key statistics\n` +
      `• "transaction analytics for last month" - Detailed analysis\n\n` +
      `Just ask me naturally, and I'll understand what you need! 🚀`
    );
  }

  /**
   * Generate smart suggestions based on context
   */
  private generateSmartSuggestions(
    userQuery: UserQuery,
    allData: any,
    originalMessage: string,
  ): string {
    let suggestions = `\n\n🎯 **Smart Suggestions:**\n`;

    // Context-aware suggestions based on query type and available data
    switch (userQuery.type) {
      case 'USER_LOOKUP':
        if (allData.users.length > 0) {
          const user = allData.users[0];
          suggestions += `• "show transactions for ${user.email}" - View their transaction history\n`;
          suggestions += `• "KYC status for ${user.email}" - Check verification status\n`;
          if (user.wallet?.balance > 0) {
            suggestions += `• "wallet operations for ${user.email}" - Manage their wallet\n`;
          }
        } else {
          suggestions += `• "show all users" - Browse all platform users\n`;
          suggestions += `• Try searching with exact email or full name\n`;
        }
        break;

      case 'TRANSACTION_HISTORY':
        suggestions += `• "transaction analytics for last month" - Get detailed insights\n`;
        suggestions += `• "failed transactions today" - Check for issues\n`;
        if (allData.users.length > 0) {
          suggestions += `• "wallet balance for ${allData.users[0].email}" - Check user's balance\n`;
        }
        break;

      case 'SYSTEM_STATUS':
        suggestions += `• "user analytics for this month" - User growth insights\n`;
        suggestions += `• "transaction volume analysis" - Revenue trends\n`;
        suggestions += `• "pending KYC submissions" - Review queue\n`;
        break;

      default:
        suggestions += `• "system status" - Get platform overview\n`;
        suggestions += `• "show recent transactions" - Latest activity\n`;
        suggestions += `• "pending KYC submissions" - Review queue\n`;
    }

    // Add confidence-based suggestions
    if (userQuery.confidence && userQuery.confidence < 0.8) {
      suggestions += `\n💡 **Not sure what you're looking for?**\n`;
      suggestions += `• Try being more specific (e.g., include email addresses)\n`;
      suggestions += `• Ask "help" to see all available commands\n`;
      suggestions += `• Use natural language - I understand context!\n`;
    }

    return suggestions;
  }

  /**
   * Get KYC status with appropriate emoji
   */
  private getKycStatusWithEmoji(status: string): string {
    switch (status) {
      case 'APPROVED':
        return '✅ Approved';
      case 'REJECTED':
        return '❌ Rejected';
      case 'PENDING':
        return '⏳ Pending Review';
      case 'SUBMITTED':
        return '📋 Submitted';
      default:
        return '❓ Unknown';
    }
  }

  /**
   * Calculate growth trend (mock implementation)
   */
  private calculateGrowthTrend(stats: any): string {
    // This would be implemented with actual historical data
    return '📈 Growing (+15% this month)';
  }

  /**
   * Calculate system utilization (mock implementation)
   */
  private calculateUtilization(stats: any): string {
    // This would be implemented with actual system metrics
    return '🟢 Optimal (85% capacity)';
  }

  /**
   * Extract data from response with multiple possible keys
   */
  private extractDataFromResponse(response: any, possibleKeys: string[]): any {
    if (!response) return null;

    for (const key of possibleKeys) {
      if (response[key] !== undefined) {
        return response[key];
      }
    }

    // If no specific key found, return the response itself if it looks like data
    if (typeof response === 'object' && !response.success && !response.error) {
      return response;
    }

    return null;
  }
}
