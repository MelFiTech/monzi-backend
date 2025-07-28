import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum LocationType {
  STORE = 'STORE',
  RESTAURANT = 'RESTAURANT',
  SERVICE = 'SERVICE',
  OFFICE = 'OFFICE',
  HOSPITAL = 'HOSPITAL',
  SCHOOL = 'SCHOOL',
  BANK = 'BANK',
  ATM = 'ATM',
  OTHER = 'OTHER',
}

export class CreateLocationDto {
  @ApiProperty({ example: 'KFC Victoria Island', description: 'Location name' })
  @IsString()
  name: string;

  @ApiProperty({ example: '123 Ahmadu Bello Way, Victoria Island, Lagos', description: 'Full address' })
  @IsString()
  address: string;

  @ApiProperty({ example: 'Lagos', description: 'City', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'Lagos State', description: 'State/Province', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: 'Nigeria', description: 'Country', default: 'Nigeria' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: 6.5244, description: 'Latitude coordinate' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 3.3792, description: 'Longitude coordinate' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ example: LocationType.RESTAURANT, description: 'Location type', enum: LocationType, default: LocationType.STORE })
  @IsOptional()
  @IsEnum(LocationType)
  locationType?: LocationType;
}

export class UpdateLocationDto {
  @ApiProperty({ example: 'KFC Victoria Island', description: 'Location name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: '123 Ahmadu Bello Way, Victoria Island, Lagos', description: 'Full address', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'Lagos', description: 'City', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'Lagos State', description: 'State/Province', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: 'Nigeria', description: 'Country', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: 6.5244, description: 'Latitude coordinate', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({ example: 3.3792, description: 'Longitude coordinate', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({ example: LocationType.RESTAURANT, description: 'Location type', enum: LocationType, required: false })
  @IsOptional()
  @IsEnum(LocationType)
  locationType?: LocationType;

  @ApiProperty({ example: true, description: 'Whether location is active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class LocationResponseDto {
  @ApiProperty({ example: 'cuid123', description: 'Location ID' })
  id: string;

  @ApiProperty({ example: 'KFC Victoria Island', description: 'Location name' })
  name: string;

  @ApiProperty({ example: '123 Ahmadu Bello Way, Victoria Island, Lagos', description: 'Full address' })
  address: string;

  @ApiProperty({ example: 'Lagos', description: 'City' })
  city?: string;

  @ApiProperty({ example: 'Lagos State', description: 'State/Province' })
  state?: string;

  @ApiProperty({ example: 'Nigeria', description: 'Country' })
  country: string;

  @ApiProperty({ example: 6.5244, description: 'Latitude coordinate' })
  latitude: number;

  @ApiProperty({ example: 3.3792, description: 'Longitude coordinate' })
  longitude: number;

  @ApiProperty({ example: LocationType.RESTAURANT, description: 'Location type', enum: LocationType })
  locationType: LocationType;

  @ApiProperty({ example: true, description: 'Whether location is active' })
  isActive: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Last update timestamp' })
  updatedAt: string;
}

export class LocationWithPaymentDetailsDto extends LocationResponseDto {
  @ApiProperty({ example: 15.5, description: 'Distance from search point in meters' })
  distance: number;

  @ApiProperty({ example: null, description: 'Payment details (null if no transactions)', required: false })
  paymentDetails?: any;
}

export class FindNearbyLocationsDto {
  @ApiProperty({ example: 6.5244, description: 'Current latitude' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 3.3792, description: 'Current longitude' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ example: 1000, description: 'Search radius in meters', default: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radius?: number;

  @ApiProperty({ example: LocationType.RESTAURANT, description: 'Filter by location type', required: false, enum: LocationType })
  @IsOptional()
  @IsEnum(LocationType)
  locationType?: LocationType;

  @ApiProperty({ example: 10, description: 'Maximum number of results', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

export class PrecisePaymentSuggestionsDto {
  @ApiProperty({ example: 6.5244, description: 'Current latitude' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 3.3792, description: 'Current longitude' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ example: 'KFC Victoria Island', description: 'Location name to match', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 50, description: 'Search radius in meters', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radius?: number;
}

export class NearbyPaymentSuggestionsDto {
  @ApiProperty({ example: 6.5244, description: 'Current latitude' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 3.3792, description: 'Current longitude' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ example: 1000, description: 'Search radius in meters', default: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radius?: number;

  @ApiProperty({ example: 10, description: 'Maximum number of results', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

export class NearbyLocationsResponseDto {
  @ApiProperty({ example: true, description: 'Success status' })
  success: boolean;

  @ApiProperty({ example: 'Nearby locations found successfully', description: 'Response message' })
  message: string;

  @ApiProperty({ type: [LocationWithPaymentDetailsDto], description: 'Array of nearby locations' })
  data: LocationWithPaymentDetailsDto[];

  @ApiProperty({ example: 5, description: 'Total number of locations found' })
  total: number;
}

export class CreateLocationResponseDto {
  @ApiProperty({ example: true, description: 'Success status' })
  success: boolean;

  @ApiProperty({ example: 'Location created successfully', description: 'Response message' })
  message: string;

  @ApiProperty({ type: LocationResponseDto, description: 'Created location data' })
  data: LocationResponseDto;
}

export class UpdateLocationResponseDto {
  @ApiProperty({ example: true, description: 'Success status' })
  success: boolean;

  @ApiProperty({ example: 'Location updated successfully', description: 'Response message' })
  message: string;

  @ApiProperty({ type: LocationResponseDto, description: 'Updated location data' })
  data: LocationResponseDto;
}

export class DeleteLocationResponseDto {
  @ApiProperty({ example: true, description: 'Success status' })
  success: boolean;

  @ApiProperty({ example: 'Location deleted successfully', description: 'Response message' })
  message: string;
} 
 
 