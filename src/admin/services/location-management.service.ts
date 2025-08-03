import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  GetLocationsQueryDto,
  GetLocationsResponseDto,
  LocationStatsDto,
  UpdateLocationNameDto,
  UpdateLocationNameResponseDto,
  ToggleLocationStatusDto,
  ToggleLocationStatusResponseDto,
  DeleteLocationDto,
  DeleteLocationResponseDto,
} from '../dto/admin.dto';
import { LocationType } from '../../location/dto/location.dto';

@Injectable()
export class LocationManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async getLocations(query: GetLocationsQueryDto): Promise<GetLocationsResponseDto> {
    console.log('🔍 [LOCATION MANAGEMENT] Getting locations with filters:', query);

    try {
      const {
        limit = 20,
        offset = 0,
        city,
        state,
        locationType,
        search,
        isActive,
        startDate,
        endDate,
      } = query;

      // Build where clause
      const where: any = {};

      if (city) {
        where.city = { contains: city, mode: 'insensitive' };
      }

      if (state) {
        where.state = { contains: state, mode: 'insensitive' };
      }

      if (locationType) {
        where.locationType = locationType;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate);
        }
      }

      // Get locations with pagination
      const [locations, total] = await Promise.all([
        this.prisma.location.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.location.count({ where }),
      ]);

      // Get statistics
      const stats = await this.getLocationStats();

      console.log(`✅ [LOCATION MANAGEMENT] Retrieved ${locations.length} locations out of ${total}`);

      return {
        success: true,
        message: 'Locations retrieved successfully',
        data: locations.map(location => ({
          id: location.id,
          name: location.name,
          address: location.address,
          city: location.city,
          state: location.state,
          country: location.country,
          latitude: location.latitude,
          longitude: location.longitude,
          locationType: location.locationType as LocationType,
          isActive: location.isActive,
          createdAt: location.createdAt.toISOString(),
          updatedAt: location.updatedAt.toISOString(),
        })),
        total,
        limit,
        offset,
        stats,
      };
    } catch (error) {
      console.error('❌ [LOCATION MANAGEMENT] Error getting locations:', error);
      throw new BadRequestException('Failed to retrieve locations');
    }
  }

  async getLocationStats(): Promise<LocationStatsDto> {
    try {
      const [
        total,
        active,
        inactive,
        byCity,
        byType,
        byState,
      ] = await Promise.all([
        this.prisma.location.count(),
        this.prisma.location.count({ where: { isActive: true } }),
        this.prisma.location.count({ where: { isActive: false } }),
        this.prisma.location.groupBy({
          by: ['city'],
          _count: { city: true },
          where: { city: { not: null } },
        }),
        this.prisma.location.groupBy({
          by: ['locationType'],
          _count: { locationType: true },
        }),
        this.prisma.location.groupBy({
          by: ['state'],
          _count: { state: true },
          where: { state: { not: null } },
        }),
      ]);

      // Transform groupBy results to Record format
      const byCityRecord: Record<string, number> = {};
      byCity.forEach(item => {
        if (item.city) {
          byCityRecord[item.city] = item._count.city;
        }
      });

      const byTypeRecord: Record<string, number> = {};
      byType.forEach(item => {
        byTypeRecord[item.locationType] = item._count.locationType;
      });

      const byStateRecord: Record<string, number> = {};
      byState.forEach(item => {
        if (item.state) {
          byStateRecord[item.state] = item._count.state;
        }
      });

      return {
        total,
        active,
        inactive,
        byCity: byCityRecord,
        byType: byTypeRecord,
        byState: byStateRecord,
      };
    } catch (error) {
      console.error('❌ [LOCATION MANAGEMENT] Error getting location stats:', error);
      throw new BadRequestException('Failed to retrieve location statistics');
    }
  }

  async updateLocationName(
    locationId: string,
    updateDto: UpdateLocationNameDto,
    adminId: string,
    adminEmail: string,
  ): Promise<UpdateLocationNameResponseDto> {
    console.log('✏️ [LOCATION MANAGEMENT] Updating location name:', {
      locationId,
      newName: updateDto.name,
      adminId,
      adminEmail,
    });

    try {
      // Check if location exists
      const existingLocation = await this.prisma.location.findUnique({
        where: { id: locationId },
      });

      if (!existingLocation) {
        throw new NotFoundException('Location not found');
      }

      // Update location name
      const updatedLocation = await this.prisma.location.update({
        where: { id: locationId },
        data: {
          name: updateDto.name,
          updatedAt: new Date(),
        },
      });

      // Log admin action
      await this.prisma.adminActionLog.create({
        data: {
          adminId,
          adminEmail,
          action: 'UPDATE_LOCATION_NAME',
          targetType: 'LOCATION',
          targetId: locationId,
          details: {
            oldName: existingLocation.name,
            newName: updateDto.name,
            reason: updateDto.reason,
          },
        },
      });

      console.log('✅ [LOCATION MANAGEMENT] Location name updated successfully');

      return {
        success: true,
        message: 'Location name updated successfully',
        data: {
          id: updatedLocation.id,
          name: updatedLocation.name,
          address: updatedLocation.address,
          city: updatedLocation.city,
          state: updatedLocation.state,
          country: updatedLocation.country,
          latitude: updatedLocation.latitude,
          longitude: updatedLocation.longitude,
          locationType: updatedLocation.locationType as LocationType,
          isActive: updatedLocation.isActive,
          createdAt: updatedLocation.createdAt.toISOString(),
          updatedAt: updatedLocation.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      console.error('❌ [LOCATION MANAGEMENT] Error updating location name:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update location name');
    }
  }

  async toggleLocationStatus(
    locationId: string,
    toggleDto: ToggleLocationStatusDto,
    adminId: string,
    adminEmail: string,
  ): Promise<ToggleLocationStatusResponseDto> {
    console.log('🔄 [LOCATION MANAGEMENT] Toggling location status:', {
      locationId,
      isActive: toggleDto.isActive,
      adminId,
      adminEmail,
    });

    try {
      // Check if location exists
      const existingLocation = await this.prisma.location.findUnique({
        where: { id: locationId },
      });

      if (!existingLocation) {
        throw new NotFoundException('Location not found');
      }

      // Update location status
      const updatedLocation = await this.prisma.location.update({
        where: { id: locationId },
        data: {
          isActive: toggleDto.isActive,
          updatedAt: new Date(),
        },
      });

      // Log admin action
      await this.prisma.adminActionLog.create({
        data: {
          adminId,
          adminEmail,
          action: 'TOGGLE_LOCATION_STATUS',
          targetType: 'LOCATION',
          targetId: locationId,
          details: {
            oldStatus: existingLocation.isActive,
            newStatus: toggleDto.isActive,
            reason: toggleDto.reason,
          },
        },
      });

      console.log('✅ [LOCATION MANAGEMENT] Location status updated successfully');

      return {
        success: true,
        message: `Location ${toggleDto.isActive ? 'activated' : 'deactivated'} successfully`,
        data: {
          id: updatedLocation.id,
          name: updatedLocation.name,
          address: updatedLocation.address,
          city: updatedLocation.city,
          state: updatedLocation.state,
          country: updatedLocation.country,
          latitude: updatedLocation.latitude,
          longitude: updatedLocation.longitude,
          locationType: updatedLocation.locationType as LocationType,
          isActive: updatedLocation.isActive,
          createdAt: updatedLocation.createdAt.toISOString(),
          updatedAt: updatedLocation.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      console.error('❌ [LOCATION MANAGEMENT] Error toggling location status:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update location status');
    }
  }

  async deleteLocation(
    locationId: string,
    deleteDto: DeleteLocationDto,
    adminId: string,
    adminEmail: string,
  ): Promise<DeleteLocationResponseDto> {
    console.log('🗑️ [LOCATION MANAGEMENT] Deleting location:', {
      locationId,
      adminId,
      adminEmail,
    });

    try {
      // Check if location exists
      const existingLocation = await this.prisma.location.findUnique({
        where: { id: locationId },
        include: {
          transactions: {
            select: { id: true },
          },
        },
      });

      if (!existingLocation) {
        throw new NotFoundException('Location not found');
      }

      // Check if location has transactions
      if (existingLocation.transactions.length > 0) {
        throw new BadRequestException(
          `Cannot delete location with ${existingLocation.transactions.length} associated transactions. Consider deactivating instead.`,
        );
      }

      // Delete location
      await this.prisma.location.delete({
        where: { id: locationId },
      });

      // Log admin action
      await this.prisma.adminActionLog.create({
        data: {
          adminId,
          adminEmail,
          action: 'DELETE_LOCATION',
          targetType: 'LOCATION',
          targetId: locationId,
          details: {
            locationName: existingLocation.name,
            reason: deleteDto.reason,
          },
        },
      });

      console.log('✅ [LOCATION MANAGEMENT] Location deleted successfully');

      return {
        success: true,
        message: 'Location deleted successfully',
      };
    } catch (error) {
      console.error('❌ [LOCATION MANAGEMENT] Error deleting location:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete location');
    }
  }

  async getLocationById(locationId: string) {
    try {
      const location = await this.prisma.location.findUnique({
        where: { id: locationId },
        include: {
          transactions: {
            select: {
              id: true,
              amount: true,
              type: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 10, // Get last 10 transactions
          },
        },
      });

      if (!location) {
        throw new NotFoundException('Location not found');
      }

      return {
        success: true,
        message: 'Location details retrieved successfully',
        data: {
          id: location.id,
          name: location.name,
          address: location.address,
          city: location.city,
          state: location.state,
          country: location.country,
          latitude: location.latitude,
          longitude: location.longitude,
          locationType: location.locationType as LocationType,
          isActive: location.isActive,
          createdAt: location.createdAt.toISOString(),
          updatedAt: location.updatedAt.toISOString(),
          transactionCount: location.transactions.length,
          recentTransactions: location.transactions,
        },
      };
    } catch (error) {
      console.error('❌ [LOCATION MANAGEMENT] Error getting location by ID:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve location details');
    }
  }
} 