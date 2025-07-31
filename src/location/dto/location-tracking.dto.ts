import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, IsArray } from 'class-validator';

// Location update from frontend
export class LocationUpdateDto {
  @ApiProperty({
    example: 6.5244,
    description: 'User latitude',
  })
  @IsNumber()
  latitude: number;

  @ApiProperty({
    example: 3.3792,
    description: 'User longitude',
  })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({
    example: 10.5,
    description: 'Location accuracy in meters',
  })
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @ApiPropertyOptional({
    example: 5.2,
    description: 'User speed in meters per second',
  })
  @IsOptional()
  @IsNumber()
  speed?: number;

  @ApiPropertyOptional({
    example: 90,
    description: 'User heading in degrees',
  })
  @IsOptional()
  @IsNumber()
  heading?: number;

  @ApiPropertyOptional({
    example: 100,
    description: 'Altitude in meters',
  })
  @IsOptional()
  @IsNumber()
  altitude?: number;
}

// Location subscription request
export class LocationSubscriptionDto {
  @ApiProperty({
    example: 'user123',
    description: 'User ID',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    example: true,
    description: 'Whether to enable location tracking',
  })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({
    example: 30,
    description: 'Update frequency in seconds (default: 30)',
  })
  @IsOptional()
  @IsNumber()
  updateFrequency?: number;

  @ApiPropertyOptional({
    example: 40,
    description: 'Proximity radius in meters (default: 40)',
  })
  @IsOptional()
  @IsNumber()
  proximityRadius?: number;
}

// Proximity detection result
export class ProximityResultDto {
  @ApiProperty({
    example: true,
    description: 'Whether user is near a location with payment details',
  })
  @IsBoolean()
  isNearby: boolean;

  @ApiPropertyOptional({
    example: 'Coffee Shop',
    description: 'Location name if nearby',
  })
  @IsOptional()
  @IsString()
  locationName?: string;

  @ApiPropertyOptional({
    example: 25.5,
    description: 'Distance to location in meters',
  })
  @IsOptional()
  @IsNumber()
  distance?: number;

  @ApiPropertyOptional({
    example: '123 Main St, Lagos',
    description: 'Location address',
  })
  @IsOptional()
  @IsString()
  locationAddress?: string;

  @ApiPropertyOptional({
    example: '1234567890',
    description: 'Location ID',
  })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional({
    example: [
      {
        accountNumber: '1234567890',
        bankName: 'GTBank',
        accountName: 'John Doe',
        lastAmount: 5000,
        frequency: 3,
      },
    ],
    description: 'Payment suggestions for this location',
  })
  @IsOptional()
  @IsArray()
  paymentSuggestions?: any[];
}

// Location-based notification data
export class LocationNotificationDto {
  @ApiProperty({
    example: 'Back at Coffee Shop? 👀',
    description: 'Notification title',
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Account details available, Tap to pay now',
    description: 'Notification body',
  })
  @IsString()
  body: string;

  @ApiProperty({
    example: 'location',
    description: 'Notification type',
  })
  @IsString()
  type: string;

  @ApiProperty({
    example: '1234567890',
    description: 'Location ID',
  })
  @IsString()
  locationId: string;

  @ApiProperty({
    example: 'Coffee Shop',
    description: 'Location name',
  })
  @IsString()
  locationName: string;

  @ApiProperty({
    example: '123 Main St, Lagos',
    description: 'Location address',
  })
  @IsString()
  locationAddress: string;

  @ApiProperty({
    example: 25.5,
    description: 'Distance to location in meters',
  })
  @IsNumber()
  distance: number;

  @ApiPropertyOptional({
    example: [
      {
        accountNumber: '1234567890',
        bankName: 'GTBank',
        accountName: 'John Doe',
        lastAmount: 5000,
        frequency: 3,
      },
    ],
    description: 'Payment suggestions for this location',
  })
  @IsOptional()
  @IsArray()
  paymentSuggestions?: any[];
}

// Location tracking response
export class LocationTrackingResponseDto {
  @ApiProperty({
    example: true,
    description: 'Whether the operation was successful',
  })
  @IsBoolean()
  success: boolean;

  @ApiProperty({
    example: 'Location tracking enabled successfully',
    description: 'Response message',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    example: {
      isNearby: true,
      locationName: 'Coffee Shop',
      distance: 25.5,
    },
    description: 'Proximity detection result',
  })
  @IsOptional()
  proximityResult?: ProximityResultDto;
} 