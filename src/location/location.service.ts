import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateLocationDto,
  UpdateLocationDto,
  LocationResponseDto,
  LocationWithPaymentDetailsDto,
  FindNearbyLocationsDto,
  NearbyLocationsResponseDto,
  LocationType,
} from './dto/location.dto';

@Injectable()
export class LocationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new location
   */
  async createLocation(dto: CreateLocationDto): Promise<LocationResponseDto> {
    console.log('📍 [LOCATION SERVICE] Creating location:', dto.name);

    const location = await this.prisma.location.create({
      data: {
        name: dto.name,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        country: dto.country || 'Nigeria',
        latitude: dto.latitude,
        longitude: dto.longitude,
        locationType: dto.locationType || LocationType.STORE,
        isActive: true,
      },
    });

    console.log('✅ [LOCATION SERVICE] Location created:', location.id);

    return this.mapToLocationResponse(location);
  }

  /**
   * Find location by ID
   */
  async findLocationById(id: string): Promise<LocationResponseDto> {
    const location = await this.prisma.location.findUnique({
      where: { id },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return this.mapToLocationResponse(location);
  }

  /**
   * Update location
   */
  async updateLocation(
    id: string,
    dto: UpdateLocationDto,
  ): Promise<LocationResponseDto> {
    console.log('📍 [LOCATION SERVICE] Updating location:', id);

    const existingLocation = await this.prisma.location.findUnique({
      where: { id },
    });

    if (!existingLocation) {
      throw new NotFoundException('Location not found');
    }

    const location = await this.prisma.location.update({
      where: { id },
      data: {
        name: dto.name,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        latitude: dto.latitude,
        longitude: dto.longitude,
        locationType: dto.locationType,
        isActive: dto.isActive,
      },
    });

    console.log('✅ [LOCATION SERVICE] Location updated:', id);

    return this.mapToLocationResponse(location);
  }

  /**
   * Delete location (soft delete by setting isActive to false)
   */
  async deleteLocation(id: string): Promise<void> {
    console.log('📍 [LOCATION SERVICE] Deleting location:', id);

    const existingLocation = await this.prisma.location.findUnique({
      where: { id },
    });

    if (!existingLocation) {
      throw new NotFoundException('Location not found');
    }

    await this.prisma.location.update({
      where: { id },
      data: { isActive: false },
    });

    console.log('✅ [LOCATION SERVICE] Location deleted:', id);
  }

  /**
   * Find nearby locations with payment details
   */
  async findNearbyLocations(
    dto: FindNearbyLocationsDto,
  ): Promise<NearbyLocationsResponseDto> {
    console.log('📍 [LOCATION SERVICE] Finding nearby locations:', {
      lat: dto.latitude,
      lng: dto.longitude,
      radius: dto.radius,
      type: dto.locationType,
    });

    const radius = dto.radius || 1000; // Default 1km
    const limit = dto.limit || 10;

    // Calculate bounding box for efficient querying
    const latDelta = radius / 111320; // 1 degree = 111.32km
    const lngDelta =
      radius / (111320 * Math.cos((dto.latitude * Math.PI) / 180));

    const locations = await this.prisma.location.findMany({
      where: {
        isActive: true,
        latitude: {
          gte: dto.latitude - latDelta,
          lte: dto.latitude + latDelta,
        },
        longitude: {
          gte: dto.longitude - lngDelta,
          lte: dto.longitude + lngDelta,
        },
        ...(dto.locationType && { locationType: dto.locationType }),
      },
      include: {
        transactions: {
          where: {
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
      take: limit,
    });

    // Filter by actual distance and add payment details
    const nearbyLocations = locations
      .map((location) => {
        const distance = this.calculateDistance(
          dto.latitude,
          dto.longitude,
          location.latitude,
          location.longitude,
        );

        if (distance <= radius) {
          return {
            ...this.mapToLocationResponse(location),
            distance,
            paymentDetails: this.extractPaymentDetails(location),
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance);

    console.log(
      '✅ [LOCATION SERVICE] Found nearby locations:',
      nearbyLocations.length,
    );

    return {
      success: true,
      message: 'Nearby locations found successfully',
      data: nearbyLocations,
      total: nearbyLocations.length,
    };
  }

  /**
   * Find or create location based on coordinates and name
   */
  async findOrCreateLocation(
    dto: CreateLocationDto,
  ): Promise<LocationResponseDto> {
    console.log(
      '📍 [LOCATION SERVICE] Finding or creating location:',
      dto.name,
    );

    // Check if location already exists within 50 meters
    const existingLocation = await this.findExistingLocation(
      dto.latitude,
      dto.longitude,
      dto.name,
      50,
    );

    if (existingLocation) {
      console.log(
        '✅ [LOCATION SERVICE] Found existing location:',
        existingLocation.id,
      );
      return this.mapToLocationResponse(existingLocation);
    }

    // Create new location
    return this.createLocation(dto);
  }

  /**
   * Get location statistics
   */
  async getLocationStats() {
    const locationCount = await this.prisma.location.count({
      where: { isActive: true },
    });

    const transactionCount = await this.prisma.transaction.count({
      where: {
        locationId: { not: null },
        status: 'COMPLETED',
      },
    });

    const locationTypes = await this.prisma.location.groupBy({
      by: ['locationType'],
      where: { isActive: true },
      _count: {
        id: true,
      },
    });

    return {
      totalLocations: locationCount,
      totalTransactions: transactionCount,
      locationTypes: locationTypes.map((lt) => ({
        type: lt.locationType,
        count: lt._count.id,
      })),
    };
  }

  /**
   * Helper method to find existing location within radius
   */
  private async findExistingLocation(
    latitude: number,
    longitude: number,
    name: string,
    radius: number,
  ) {
    const latDelta = radius / 111320;
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
    });

    // Find the closest location within radius
    for (const location of locations) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        location.latitude,
        location.longitude,
      );

      if (distance <= radius) {
        return location;
      }
    }

    return null;
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
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Extract payment details from location transactions
   */
  private extractPaymentDetails(location: any): any {
    if (!location.transactions || location.transactions.length === 0) {
      return null;
    }

    const lastTransaction = location.transactions[0];
    const toAccount = lastTransaction.toAccount;

    if (!toAccount) {
      return null;
    }

    return {
      accountNumber: toAccount.accountNumber,
      bankName: toAccount.bankName,
      accountName: toAccount.accountName,
      lastAmount: lastTransaction.amount,
      lastTransactionDate: lastTransaction.createdAt,
      transactionCount: location._count.transactions,
    };
  }

  /**
   * Map database location to response DTO
   */
  private mapToLocationResponse(location: any): LocationResponseDto {
    return {
      id: location.id,
      name: location.name,
      address: location.address,
      city: location.city,
      state: location.state,
      country: location.country,
      latitude: location.latitude,
      longitude: location.longitude,
      locationType: location.locationType,
      isActive: location.isActive,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
    };
  }
}
