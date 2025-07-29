import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface LocationMatch {
  locationId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance: number;
  confidence: number;
  paymentSuggestions: PaymentSuggestion[];
}

export interface PaymentSuggestion {
  accountNumber: string;
  bankName: string;
  accountName: string;
  frequency: number;
  lastTransactionDate: Date;
}

@Injectable()
export class LocationPrecisionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find exact location match with high precision
   */
  async findExactLocationMatch(
    latitude: number,
    longitude: number,
    name?: string,
    radius: number = 50, // 50 meters for exact match
  ): Promise<LocationMatch | null> {
    try {
      console.log('🎯 [LOCATION PRECISION] Finding exact location match:', {
        latitude,
        longitude,
        name,
        radius,
      });

      // Validate input parameters
      if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        console.error('❌ [LOCATION PRECISION] Invalid coordinates provided:', {
          latitude,
          longitude,
        });
        return null;
      }

      // Calculate bounding box for efficient querying
      const latDelta = radius / 111320; // 1 degree = 111.32km
      const lngDelta = radius / (111320 * Math.cos((latitude * Math.PI) / 180));

      console.log('📐 [LOCATION PRECISION] Bounding box calculation:', {
        latDelta,
        lngDelta,
        latRange: [latitude - latDelta, latitude + latDelta],
        lngRange: [longitude - lngDelta, longitude + lngDelta],
      });

      const locations = await this.prisma.location.findMany({
        where: {
          isActive: true,
          latitude: {
            gte: latitude - latDelta,
            lte: latitude + latDelta,
          },
          longitude: {
            gte: longitude - lngDelta,
            lte: longitude + lngDelta,
          },
          ...(name &&
            name !== 'Unknown' && {
              OR: [
                { name: { contains: name, mode: 'insensitive' } },
                {
                  name: {
                    contains: this.normalizeLocationName(name),
                    mode: 'insensitive',
                  },
                },
              ],
            }),
        },
        include: {
          transactions: {
            where: {
              status: 'COMPLETED',
            },
            include: {
              toAccount: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      console.log(
        '📍 [LOCATION PRECISION] Found',
        locations.length,
        'locations in search area',
      );

      // Log each location found
      locations.forEach((location, index) => {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          location.latitude,
          location.longitude,
        );
        console.log(`📍 [LOCATION PRECISION] Location ${index + 1}:`, {
          id: location.id,
          name: location.name,
          address: location.address,
          latitude: location.latitude,
          longitude: location.longitude,
          distance: distance.toFixed(2) + 'm',
          transactionCount: location.transactions.length,
          hasCompletedTransactions: location.transactions.some(
            (t) => t.status === 'COMPLETED',
          ),
          toAccountCount: location.transactions.filter((t) => t.toAccount)
            .length,
          businessAccountCount: location.transactions.filter((t) => {
            if (!t.toAccount) return false;
            return t.toAccount.isBusiness !== null
              ? t.toAccount.isBusiness
              : this.isBusinessAccount(t.toAccount.accountName);
          }).length,
        });
      });

      // Find the closest match within radius
      let bestMatch: LocationMatch | null = null;
      let bestDistance = Infinity;

      for (const location of locations) {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          location.latitude,
          location.longitude,
        );

        console.log(
          `🔍 [LOCATION PRECISION] Processing location "${location.name}":`,
          {
            distance: distance.toFixed(2) + 'm',
            withinRadius: distance <= radius,
            betterThanCurrent: distance < bestDistance,
          },
        );

        if (distance <= radius && distance < bestDistance) {
          const confidence = this.calculateConfidence(
            distance,
            name,
            location.name,
          );
          console.log(`📊 [LOCATION PRECISION] Confidence calculation:`, {
            distance: distance.toFixed(2) + 'm',
            confidence: confidence.toFixed(4),
            aboveThreshold: confidence >= 0.7,
          });

          if (confidence >= 0.7) {
            // 70% confidence threshold
            const paymentSuggestions = this.extractPaymentSuggestions(
              location.transactions,
            );
            console.log(`💳 [LOCATION PRECISION] Payment suggestions:`, {
              count: paymentSuggestions.length,
              hasBusinessSuggestions: paymentSuggestions.length > 0,
            });

            if (paymentSuggestions.length > 0) {
              bestMatch = {
                locationId: location.id,
                name: location.name,
                address: location.address,
                latitude: location.latitude,
                longitude: location.longitude,
                distance,
                confidence,
                paymentSuggestions,
              };

              bestDistance = distance;
              console.log(
                `✅ [LOCATION PRECISION] Selected "${location.name}" as best match!`,
              );
            } else {
              console.log(
                `❌ [LOCATION PRECISION] No payment suggestions for "${location.name}", skipping`,
              );
            }
          } else {
            console.log(
              `❌ [LOCATION PRECISION] Confidence too low for "${location.name}" (${confidence.toFixed(4)} < 0.7), skipping`,
            );
          }
        } else {
          console.log(
            `❌ [LOCATION PRECISION] Location "${location.name}" not suitable:`,
            {
              distance: distance.toFixed(2) + 'm',
              withinRadius: distance <= radius,
              betterThanCurrent: distance < bestDistance,
            },
          );
        }
      }

      console.log(
        '🎯 [LOCATION PRECISION] Best match found:',
        bestMatch
          ? {
              name: bestMatch.name,
              distance: bestMatch.distance.toFixed(2) + 'm',
              confidence: bestMatch.confidence.toFixed(4),
              paymentSuggestionsCount: bestMatch.paymentSuggestions.length,
            }
          : 'null',
      );

      if (bestMatch) {
        console.log('🎯 [LOCATION PRECISION] Exact Match Details:', {
          locationId: bestMatch.locationId,
          name: bestMatch.name,
          address: bestMatch.address,
          distance: bestMatch.distance.toFixed(2) + 'm',
          confidence: bestMatch.confidence.toFixed(4),
          paymentSuggestionsCount: bestMatch.paymentSuggestions.length,
          paymentSuggestions: bestMatch.paymentSuggestions.map((s) => ({
            accountNumber: s.accountNumber,
            bankName: s.bankName,
            accountName: s.accountName,
            frequency: s.frequency,
          })),
        });
      }

      return bestMatch;
    } catch (error) {
      console.error(
        '❌ [LOCATION PRECISION] Error in findExactLocationMatch:',
        error,
      );
      return null;
    }
  }

  /**
   * Get payment suggestions for a specific location
   */
  async getPaymentSuggestionsForLocation(
    locationId: string,
    limit: number = 5,
  ): Promise<PaymentSuggestion[]> {
    try {
      console.log(
        '💳 [LOCATION PRECISION] Getting payment suggestions for location:',
        locationId,
      );

      const location = await this.prisma.location.findUnique({
        where: { id: locationId },
        include: {
          transactions: {
            where: {
              status: 'COMPLETED',
            },
            include: {
              toAccount: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!location) {
        console.log('❌ [LOCATION PRECISION] Location not found:', locationId);
        return [];
      }

      const paymentSuggestions = this.extractPaymentSuggestions(
        location.transactions,
      );
      const limitedSuggestions = paymentSuggestions.slice(0, limit);

      console.log(
        '💳 [LOCATION PRECISION] Payment suggestions retrieved:',
        limitedSuggestions.length,
      );
      return limitedSuggestions;
    } catch (error) {
      console.error(
        '❌ [LOCATION PRECISION] Error in getPaymentSuggestionsForLocation:',
        error,
      );
      return [];
    }
  }

  /**
   * Get nearby locations with payment suggestions
   */
  async getNearbyLocationsWithSuggestions(
    latitude: number,
    longitude: number,
    radius: number = 1000,
    limit: number = 10,
  ): Promise<LocationMatch[]> {
    try {
      console.log('📍 [LOCATION PRECISION] Finding nearby locations:', {
        latitude,
        longitude,
        radius,
        limit,
      });

      // Validate input parameters
      if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        console.error('❌ [LOCATION PRECISION] Invalid coordinates provided:', {
          latitude,
          longitude,
        });
        return [];
      }

      // Calculate bounding box for efficient querying
      const latDelta = radius / 111320; // 1 degree = 111.32km
      const lngDelta = radius / (111320 * Math.cos((latitude * Math.PI) / 180));

      const locations = await this.prisma.location.findMany({
        where: {
          isActive: true,
          latitude: {
            gte: latitude - latDelta,
            lte: latitude + latDelta,
          },
          longitude: {
            gte: longitude - lngDelta,
            lte: longitude + lngDelta,
          },
        },
        include: {
          transactions: {
            where: {
              status: 'COMPLETED',
            },
            include: {
              toAccount: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      console.log(
        '📍 [LOCATION PRECISION] Found',
        locations.length,
        'locations in nearby search area',
      );

      // Log each location found
      locations.forEach((location, index) => {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          location.latitude,
          location.longitude,
        );
        console.log(`📍 [LOCATION PRECISION] Nearby Location ${index + 1}:`, {
          id: location.id,
          name: location.name,
          address: location.address,
          latitude: location.latitude,
          longitude: location.longitude,
          distance: distance.toFixed(2) + 'm',
          transactionCount: location.transactions.length,
          hasCompletedTransactions: location.transactions.some(
            (t) => t.status === 'COMPLETED',
          ),
          toAccountCount: location.transactions.filter((t) => t.toAccount)
            .length,
          businessAccountCount: location.transactions.filter((t) => {
            if (!t.toAccount) return false;
            return t.toAccount.isBusiness !== null
              ? t.toAccount.isBusiness
              : this.isBusinessAccount(t.toAccount.accountName);
          }).length,
        });
      });

      // Calculate distances and filter by radius
      const locationMatches: LocationMatch[] = [];

      for (const location of locations) {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          location.latitude,
          location.longitude,
        );

        if (distance <= radius) {
          const confidence = this.calculateConfidence(distance);
          const paymentSuggestions = this.extractPaymentSuggestions(
            location.transactions,
          );

          locationMatches.push({
            locationId: location.id,
            name: location.name,
            address: location.address,
            latitude: location.latitude,
            longitude: location.longitude,
            distance,
            confidence,
            paymentSuggestions,
          });
        }
      }

      // Sort by distance and confidence, then limit results
      const sortedMatches = locationMatches
        .sort((a, b) => {
          // Primary sort by distance
          if (Math.abs(a.distance - b.distance) > 10) {
            return a.distance - b.distance;
          }
          // Secondary sort by confidence
          return b.confidence - a.confidence;
        })
        .slice(0, limit);

      // Deduplicate payment suggestions across locations
      const deduplicatedMatches =
        this.deduplicatePaymentSuggestions(sortedMatches);

      console.log(
        '📍 [LOCATION PRECISION] Nearby locations found:',
        deduplicatedMatches.length,
      );

      // Log the final results with payment suggestions
      deduplicatedMatches.forEach((match, index) => {
        console.log(`🎯 [LOCATION PRECISION] Final Match ${index + 1}:`, {
          locationId: match.locationId,
          name: match.name,
          address: match.address,
          distance: match.distance.toFixed(2) + 'm',
          confidence: match.confidence.toFixed(4),
          paymentSuggestionsCount: match.paymentSuggestions.length,
          paymentSuggestions: match.paymentSuggestions.map((s) => ({
            accountNumber: s.accountNumber,
            bankName: s.bankName,
            accountName: s.accountName,
            frequency: s.frequency,
          })),
        });
      });

      return deduplicatedMatches;
    } catch (error) {
      console.error(
        '❌ [LOCATION PRECISION] Error in getNearbyLocationsWithSuggestions:',
        error,
      );
      return [];
    }
  }

  /**
   * Calculate confidence score based on distance and name similarity
   */
  private calculateConfidence(
    distance: number,
    searchName?: string,
    locationName?: string,
  ): number {
    try {
      // Distance-based confidence (closer = higher confidence)
      const distanceConfidence = Math.max(0, 1 - distance / 1000); // 0-1 scale

      // Name similarity confidence
      let nameConfidence = 0.5; // Default confidence
      if (searchName && locationName) {
        nameConfidence = this.calculateNameSimilarity(searchName, locationName);
      }

      // Weighted average (distance is more important)
      const confidence = distanceConfidence * 0.7 + nameConfidence * 0.3;

      return Math.min(1, Math.max(0, confidence));
    } catch (error) {
      console.error(
        '❌ [LOCATION PRECISION] Error in calculateConfidence:',
        error,
      );
      return 0.5; // Default confidence on error
    }
  }

  /**
   * Calculate name similarity using simple string matching
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    try {
      const normalized1 = this.normalizeLocationName(name1).toLowerCase();
      const normalized2 = this.normalizeLocationName(name2).toLowerCase();

      if (normalized1 === normalized2) return 1.0;
      if (
        normalized1.includes(normalized2) ||
        normalized2.includes(normalized1)
      )
        return 0.8;

      // Simple word overlap calculation
      const words1 = normalized1.split(/\s+/);
      const words2 = normalized2.split(/\s+/);
      const commonWords = words1.filter((word) => words2.includes(word));

      if (commonWords.length === 0) return 0.1;

      const similarity =
        commonWords.length / Math.max(words1.length, words2.length);
      return Math.min(0.7, similarity);
    } catch (error) {
      console.error(
        '❌ [LOCATION PRECISION] Error in calculateNameSimilarity:',
        error,
      );
      return 0.1; // Default similarity on error
    }
  }

  /**
   * Normalize location name for better matching
   */
  private normalizeLocationName(name: string): string {
    try {
      return name
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    } catch (error) {
      console.error(
        '❌ [LOCATION PRECISION] Error in normalizeLocationName:',
        error,
      );
      return name || ''; // Return original name on error
    }
  }

  /**
   * Check if an account name represents a business
   */
  private isBusinessAccount(accountName: string): boolean {
    try {
      if (!accountName || typeof accountName !== 'string') {
        return false;
      }

      const businessKeywords = [
        'STORE',
        'SHOP',
        'ENTERPRISE',
        'LTD',
        'LIMITED',
        'INC',
        'CORP',
        'CORPORATION',
        'BUSINESS',
        'COMPANY',
        'VENTURES',
        'TRADING',
        'SERVICES',
        'ENTERPRISES',
        'MART',
        'MARKET',
        'SUPERMARKET',
        'MALL',
        'PLAZA',
        'COMPLEX',
        'CENTER',
        'RESTAURANT',
        'HOTEL',
        'CAFE',
        'BAR',
        'CLUB',
        'SALON',
        'SPA',
        'GYM',
        'PHARMACY',
        'HOSPITAL',
        'CLINIC',
        'SCHOOL',
        'UNIVERSITY',
        'COLLEGE',
        'BANK',
        'MICROFINANCE',
        'INSURANCE',
        'AGENCY',
        'BUREAU',
        'OFFICE',
        'STUDIO',
        'GALLERY',
        'THEATER',
        'CINEMA',
        'GAS',
        'PETROL',
        'STATION',
        'TRANSPORT',
        'LOGISTICS',
        'DELIVERY',
        'COURIER',
        'EXPRESS',
        'FAST',
        'QUICK',
        'SPEED',
        'RAPID',
        'SWIFT',
        'INSTANT',
        'IMMEDIATE',
      ];

      const normalizedName = accountName.toUpperCase().trim();

      // Check for business keywords
      for (const keyword of businessKeywords) {
        if (normalizedName.includes(keyword)) {
          return true;
        }
      }

      // Check for business patterns (e.g., "NAME & SONS", "NAME ENTERPRISES")
      const businessPatterns = [
        /& SONS/i,
        /& DAUGHTERS/i,
        /& CO/i,
        /& COMPANY/i,
        /ENTERPRISES/i,
        /VENTURES/i,
        /TRADING/i,
        /SERVICES/i,
        /GROUP/i,
        /HOLDINGS/i,
        /INTERNATIONAL/i,
        /GLOBAL/i,
        /WORLDWIDE/i,
      ];

      for (const pattern of businessPatterns) {
        if (pattern.test(normalizedName)) {
          return true;
        }
      }

      // Check if it looks like a personal name (first + last name pattern)
      const words = normalizedName.split(/\s+/);
      if (words.length >= 2 && words.length <= 4) {
        // If it's 2-4 words and doesn't contain business keywords, likely personal
        return false;
      }

      // Default to business if unclear
      return true;
    } catch (error) {
      console.error(
        '❌ [LOCATION PRECISION] Error in isBusinessAccount:',
        error,
      );
      return false; // Default to individual on error
    }
  }

  /**
   * Extract payment suggestions from transactions
   */
  private extractPaymentSuggestions(transactions: any[]): PaymentSuggestion[] {
    try {
      console.log(
        '💳 [PAYMENT SUGGESTIONS] Extracting payment suggestions from',
        transactions.length,
        'transactions',
      );

      const suggestions = new Map<string, PaymentSuggestion>();

      for (const transaction of transactions) {
        console.log('🔍 [PAYMENT SUGGESTIONS] Processing transaction:', {
          id: transaction.id,
          amount: transaction.amount,
          hasToAccount: !!transaction.toAccount,
          toAccountData: transaction.toAccount
            ? {
                accountNumber: transaction.toAccount.accountNumber,
                bankName: transaction.toAccount.bankName,
                accountName: transaction.toAccount.accountName,
              }
            : null,
        });

        if (!transaction.toAccount) {
          console.log(
            '⚠️ [PAYMENT SUGGESTIONS] Transaction has no toAccount, skipping',
          );
          continue;
        }

        // Check if this is a business account
        const isBusiness =
          transaction.toAccount.isBusiness !== null
            ? transaction.toAccount.isBusiness
            : this.isBusinessAccount(transaction.toAccount.accountName);
        console.log(
          `🏢 [PAYMENT SUGGESTIONS] Account "${transaction.toAccount.accountName}" is ${isBusiness ? 'BUSINESS' : 'INDIVIDUAL'} (${transaction.toAccount.isBusiness !== null ? 'user-tagged' : 'auto-detected'})`,
        );

        // Only include business accounts in global suggestions
        if (!isBusiness) {
          console.log(
            '🚫 [PAYMENT SUGGESTIONS] Skipping individual account - not suggesting globally',
          );
          continue;
        }

        const key = `${transaction.toAccount.accountNumber}-${transaction.toAccount.bankName}`;

        if (suggestions.has(key)) {
          const existing = suggestions.get(key)!;
          existing.frequency += 1;
          if (transaction.createdAt > existing.lastTransactionDate) {
            existing.lastTransactionDate = transaction.createdAt;
          }
          console.log(
            '📈 [PAYMENT SUGGESTIONS] Updated existing suggestion frequency:',
            existing.frequency,
          );
        } else {
          const newSuggestion: PaymentSuggestion = {
            accountNumber: transaction.toAccount.accountNumber,
            bankName: transaction.toAccount.bankName,
            accountName: transaction.toAccount.accountName,
            frequency: 1,
            lastTransactionDate: transaction.createdAt,
          };
          suggestions.set(key, newSuggestion);
          console.log(
            '✅ [PAYMENT SUGGESTIONS] Created new business suggestion:',
            {
              accountNumber: newSuggestion.accountNumber,
              bankName: newSuggestion.bankName,
              accountName: newSuggestion.accountName,
              frequency: newSuggestion.frequency,
            },
          );
        }
      }

      // Sort by frequency and recency
      const sortedSuggestions = Array.from(suggestions.values()).sort(
        (a, b) => {
          if (b.frequency !== a.frequency) {
            return b.frequency - a.frequency;
          }
          return (
            b.lastTransactionDate.getTime() - a.lastTransactionDate.getTime()
          );
        },
      );

      console.log(
        '🎯 [PAYMENT SUGGESTIONS] Final business suggestions:',
        sortedSuggestions.map((s) => ({
          accountNumber: s.accountNumber,
          bankName: s.bankName,
          accountName: s.accountName,
          frequency: s.frequency,
        })),
      );

      return sortedSuggestions;
    } catch (error) {
      console.error(
        '❌ [LOCATION PRECISION] Error in extractPaymentSuggestions:',
        error,
      );
      return [];
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    try {
      const R = 6371e3; // Earth's radius in meters
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lng2 - lng1) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c; // Distance in meters
    } catch (error) {
      console.error(
        '❌ [LOCATION PRECISION] Error in calculateDistance:',
        error,
      );
      return Infinity; // Return large distance on error
    }
  }

  /**
   * Deduplicate payment suggestions across locations to prevent showing the same business multiple times
   */
  private deduplicatePaymentSuggestions(
    locationMatches: LocationMatch[],
  ): LocationMatch[] {
    try {
      console.log(
        '🔄 [LOCATION PRECISION] Deduplicating payment suggestions across locations',
      );

      const seenBusinessAccounts = new Set<string>();
      const deduplicatedMatches: LocationMatch[] = [];

      for (const match of locationMatches) {
        const uniqueSuggestions: PaymentSuggestion[] = [];

        for (const suggestion of match.paymentSuggestions) {
          const businessKey = `${suggestion.accountNumber}-${suggestion.bankName}`;

          if (!seenBusinessAccounts.has(businessKey)) {
            seenBusinessAccounts.add(businessKey);
            uniqueSuggestions.push(suggestion);
            console.log(
              `✅ [LOCATION PRECISION] Added unique business suggestion: ${suggestion.accountName} (${suggestion.accountNumber})`,
            );
          } else {
            console.log(
              `🚫 [LOCATION PRECISION] Skipped duplicate business suggestion: ${suggestion.accountName} (${suggestion.accountNumber})`,
            );
          }
        }

        // Only include locations that have unique payment suggestions
        if (uniqueSuggestions.length > 0) {
          deduplicatedMatches.push({
            ...match,
            paymentSuggestions: uniqueSuggestions,
          });
        } else {
          console.log(
            `📍 [LOCATION PRECISION] Skipping location "${match.name}" - no unique payment suggestions`,
          );
        }
      }

      console.log(
        `🔄 [LOCATION PRECISION] Deduplication complete: ${locationMatches.length} → ${deduplicatedMatches.length} locations`,
      );
      return deduplicatedMatches;
    } catch (error) {
      console.error(
        '❌ [LOCATION PRECISION] Error in deduplicatePaymentSuggestions:',
        error,
      );
      return locationMatches; // Return original on error
    }
  }
}
