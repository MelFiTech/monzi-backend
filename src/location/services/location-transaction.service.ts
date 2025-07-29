import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LocationService } from '../location.service';
import { CreateLocationDto } from '../dto/location.dto';

export interface TransactionLocationData {
  name: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  latitude: number;
  longitude: number;
  locationType?: string;
}

@Injectable()
export class LocationTransactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationService: LocationService,
  ) {}

  /**
   * Associate location with transaction
   */
  async associateLocationWithTransaction(
    transactionId: string,
    locationData: TransactionLocationData,
  ): Promise<void> {
    console.log(
      '📍 [LOCATION TRANSACTION SERVICE] Associating location with transaction:',
      transactionId,
    );

    try {
      // Find or create location
      const location = await this.locationService.findOrCreateLocation({
        name: locationData.name,
        address: locationData.address,
        city: locationData.city,
        state: locationData.state,
        country: locationData.country || 'Nigeria',
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        locationType: locationData.locationType as any,
      });

      // Update transaction with location ID
      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: { locationId: location.id },
      });

      console.log(
        '✅ [LOCATION TRANSACTION SERVICE] Location associated with transaction:',
        {
          transactionId,
          locationId: location.id,
        },
      );
    } catch (error) {
      console.error(
        '❌ [LOCATION TRANSACTION SERVICE] Failed to associate location:',
        error,
      );
      // Don't throw error to avoid breaking transaction flow
    }
  }

  /**
   * Get payment suggestions for a location
   */
  async getPaymentSuggestionsForLocation(locationId: string) {
    console.log(
      '📍 [LOCATION TRANSACTION SERVICE] Getting payment suggestions for location:',
      locationId,
    );

    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
      include: {
        transactions: {
          where: {
            status: 'COMPLETED',
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5, // Get last 5 transactions
          include: {
            toAccount: true,
          },
        },
        _count: {
          select: {
            transactions: {
              where: {
                status: 'COMPLETED',
              },
            },
          },
        },
      },
    });

    if (!location) {
      return null;
    }

    // Extract unique payment details
    const paymentSuggestions = location.transactions
      .filter((tx) => tx.toAccount)
      .map((tx) => ({
        accountNumber: tx.toAccount.accountNumber,
        bankName: tx.toAccount.bankName,
        accountName: tx.toAccount.accountName,
        lastAmount: tx.amount,
        lastTransactionDate: tx.createdAt,
        frequency: location.transactions.filter(
          (t) => t.toAccount?.accountNumber === tx.toAccount.accountNumber,
        ).length,
      }))
      .filter(
        (suggestion, index, self) =>
          index ===
          self.findIndex((s) => s.accountNumber === suggestion.accountNumber),
      )
      .sort((a, b) => b.frequency - a.frequency);

    return {
      location: {
        id: location.id,
        name: location.name,
        address: location.address,
        city: location.city,
        state: location.state,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
        locationType: location.locationType,
      },
      paymentSuggestions,
      totalTransactions: location._count.transactions,
    };
  }

  /**
   * Get location-based transaction history
   */
  async getLocationTransactionHistory(locationId: string, limit = 10) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        locationId,
        status: 'COMPLETED',
      },
      include: {
        toAccount: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return transactions.map((tx) => ({
      id: tx.id,
      amount: tx.amount,
      currency: tx.currency,
      description: tx.description,
      reference: tx.reference,
      createdAt: tx.createdAt,
      paymentDetails: tx.toAccount
        ? {
            accountNumber: tx.toAccount.accountNumber,
            bankName: tx.toAccount.bankName,
            accountName: tx.toAccount.accountName,
          }
        : null,
      user: tx.user
        ? {
            id: tx.user.id,
            name: `${tx.user.firstName || ''} ${tx.user.lastName || ''}`.trim(),
          }
        : null,
    }));
  }

  /**
   * Get popular locations for a user
   */
  async getUserPopularLocations(userId: string, limit = 5) {
    const popularLocations = await this.prisma.location.findMany({
      where: {
        transactions: {
          some: {
            userId,
            status: 'COMPLETED',
          },
        },
        isActive: true,
      },
      include: {
        _count: {
          select: {
            transactions: {
              where: {
                userId,
                status: 'COMPLETED',
              },
            },
          },
        },
        transactions: {
          where: {
            userId,
            status: 'COMPLETED',
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          include: {
            toAccount: true,
          },
        },
      },
      orderBy: {
        transactions: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return popularLocations.map((location) => ({
      id: location.id,
      name: location.name,
      address: location.address,
      city: location.city,
      state: location.state,
      country: location.country,
      latitude: location.latitude,
      longitude: location.longitude,
      locationType: location.locationType,
      visitCount: location._count.transactions,
      lastVisit: location.transactions[0]?.createdAt,
      lastPaymentDetails: location.transactions[0]?.toAccount
        ? {
            accountNumber: location.transactions[0].toAccount.accountNumber,
            bankName: location.transactions[0].toAccount.bankName,
            accountName: location.transactions[0].toAccount.accountName,
            amount: location.transactions[0].amount,
          }
        : null,
    }));
  }
}
