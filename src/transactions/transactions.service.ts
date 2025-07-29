import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CalculateFeeDto,
  FeeCalculationResponseDto,
  GetFeeTiersResponseDto,
  FeeTierDto,
} from './dto/transaction.dto';
import { FeeType } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate transaction fee for a given amount and transaction type
   */
  async calculateFee(dto: CalculateFeeDto): Promise<FeeCalculationResponseDto> {
    console.log('💰 [TRANSACTIONS SERVICE] Calculating fee for:', dto);

    const { amount, transactionType, provider } = dto;

    // Validate amount
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // First, try to find provider-specific fee configuration
    let feeConfig = null;
    if (provider) {
      const providerFeeType =
        `${transactionType}_${provider.toUpperCase()}` as FeeType;
      feeConfig = await this.prisma.feeConfiguration.findUnique({
        where: {
          feeType: providerFeeType,
          isActive: true,
        },
      });
    }

    // If no provider-specific config, try general transaction type
    if (!feeConfig) {
      feeConfig = await this.prisma.feeConfiguration.findUnique({
        where: {
          feeType: transactionType as FeeType,
          isActive: true,
        },
      });
    }

    // If still no config, try transfer fee tiers
    if (!feeConfig) {
      const feeTier = await this.findApplicableFeeTier(amount, provider);
      if (feeTier) {
        return this.createTieredFeeResponse(
          amount,
          transactionType,
          provider,
          feeTier,
        );
      }
    }

    // If no fee configuration found, return zero fee
    if (!feeConfig) {
      console.log(
        '⚠️ [TRANSACTIONS SERVICE] No fee configuration found, returning zero fee',
      );
      return this.createZeroFeeResponse(amount, transactionType, provider);
    }

    // Calculate fee based on configuration
    let feeAmount = 0;
    let feeType: 'PERCENTAGE' | 'FIXED' | 'TIERED' = 'FIXED';

    if (feeConfig.percentage) {
      feeAmount = (amount * feeConfig.percentage) / 100;
      feeType = 'PERCENTAGE';
    } else if (feeConfig.fixedAmount) {
      feeAmount = feeConfig.fixedAmount;
      feeType = 'FIXED';
    }

    // Apply min/max constraints
    if (feeConfig.minAmount && feeAmount < feeConfig.minAmount) {
      feeAmount = feeConfig.minAmount;
    }
    if (feeConfig.maxAmount && feeAmount > feeConfig.maxAmount) {
      feeAmount = feeConfig.maxAmount;
    }

    const totalAmount = amount + feeAmount;

    console.log('✅ [TRANSACTIONS SERVICE] Fee calculated:', {
      amount,
      feeAmount,
      feeType,
      totalAmount,
    });

    return {
      success: true,
      message: 'Fee calculated successfully',
      data: {
        amount,
        transactionType,
        provider,
        feeAmount,
        feeType,
        totalAmount,
        breakdown: {
          transferAmount: amount,
          fee: feeAmount,
          total: totalAmount,
        },
      },
    };
  }

  /**
   * Get all fee tiers for a provider
   */
  async getFeeTiers(provider?: string): Promise<GetFeeTiersResponseDto> {
    console.log(
      '📊 [TRANSACTIONS SERVICE] Getting fee tiers for provider:',
      provider,
    );

    const whereClause = provider
      ? { provider, isActive: true }
      : { isActive: true };

    const feeTiers = await this.prisma.transferFeeTier.findMany({
      where: whereClause,
      orderBy: { minAmount: 'asc' },
    });

    const feeTierDtos: FeeTierDto[] = feeTiers.map((tier) => ({
      name: tier.name,
      minAmount: tier.minAmount,
      maxAmount: tier.maxAmount || undefined,
      feeAmount: tier.feeAmount,
      provider: tier.provider || undefined,
    }));

    console.log(
      '✅ [TRANSACTIONS SERVICE] Found fee tiers:',
      feeTierDtos.length,
    );

    return {
      success: true,
      message: 'Fee tiers retrieved successfully',
      data: feeTierDtos,
    };
  }

  /**
   * Find applicable fee tier for a given amount
   */
  private async findApplicableFeeTier(
    amount: number,
    provider?: string,
  ): Promise<any> {
    // First try to find provider-specific tier
    if (provider) {
      const providerTier = await this.prisma.transferFeeTier.findFirst({
        where: {
          minAmount: { lte: amount },
          isActive: true,
          provider: provider,
          OR: [
            { maxAmount: { gte: amount } },
            { maxAmount: null }, // Unlimited max
          ],
        },
        orderBy: { minAmount: 'desc' }, // Get the highest applicable tier
      });

      if (providerTier) {
        return providerTier;
      }
    }

    // If no provider-specific tier found, fall back to global tiers (where provider is null/empty)
    const globalTier = await this.prisma.transferFeeTier.findFirst({
      where: {
        minAmount: { lte: amount },
        isActive: true,
        OR: [{ provider: null }, { provider: '' }],
        AND: [
          {
            OR: [
              { maxAmount: { gte: amount } },
              { maxAmount: null }, // Unlimited max
            ],
          },
        ],
      },
      orderBy: { minAmount: 'desc' }, // Get the highest applicable tier
    });

    return globalTier;
  }

  /**
   * Create response for tiered fee calculation
   */
  private createTieredFeeResponse(
    amount: number,
    transactionType: string,
    provider: string | undefined,
    feeTier: any,
  ): FeeCalculationResponseDto {
    const feeAmount = feeTier.feeAmount;
    const totalAmount = amount + feeAmount;

    return {
      success: true,
      message: 'Fee calculated successfully using tiered pricing',
      data: {
        amount,
        transactionType,
        provider,
        feeAmount,
        feeType: 'TIERED',
        totalAmount,
        breakdown: {
          transferAmount: amount,
          fee: feeAmount,
          total: totalAmount,
        },
      },
    };
  }

  /**
   * Create response for zero fee
   */
  private createZeroFeeResponse(
    amount: number,
    transactionType: string,
    provider: string | undefined,
  ): FeeCalculationResponseDto {
    return {
      success: true,
      message: 'No fee applicable for this transaction',
      data: {
        amount,
        transactionType,
        provider,
        feeAmount: 0,
        feeType: 'FIXED',
        totalAmount: amount,
        breakdown: {
          transferAmount: amount,
          fee: 0,
          total: amount,
        },
      },
    };
  }
}
