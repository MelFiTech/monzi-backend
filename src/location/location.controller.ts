import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LocationService } from './location.service';
import { LocationPrecisionService } from './services/location-precision.service';
import { 
  CreateLocationDto,
  UpdateLocationDto,
  FindNearbyLocationsDto,
  PrecisePaymentSuggestionsDto,
  NearbyPaymentSuggestionsDto,
  CreateLocationResponseDto,
  UpdateLocationResponseDto,
  DeleteLocationResponseDto,
  NearbyLocationsResponseDto,
  LocationResponseDto
} from './dto/location.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Locations')
@Controller('locations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LocationController {
  constructor(
    private readonly locationService: LocationService,
    private readonly locationPrecisionService: LocationPrecisionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create a new location', 
    description: 'Create a new location with coordinates and details' 
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Location created successfully', 
    type: CreateLocationResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createLocation(@Body() dto: CreateLocationDto): Promise<CreateLocationResponseDto> {
    const location = await this.locationService.createLocation(dto);
    
    return {
      success: true,
      message: 'Location created successfully',
      data: location,
    };
  }

  @Get('nearby')
  @ApiOperation({ 
    summary: 'Find nearby locations', 
    description: 'Find locations near the given coordinates with payment details' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Nearby locations found successfully', 
    type: NearbyLocationsResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Invalid coordinates' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findNearbyLocations(@Query() dto: FindNearbyLocationsDto): Promise<NearbyLocationsResponseDto> {
    return this.locationService.findNearbyLocations(dto);
  }

  @Get('suggestions/precise')
  @ApiOperation({ 
    summary: 'Get precise business payment details', 
    description: 'Get exact location match and business payment details (account number, bank name, account name) based on GPS coordinates. Suggests payment details of businesses that other users have paid to at this location.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Business payment details retrieved successfully' 
  })
  @ApiResponse({ status: 400, description: 'Invalid coordinates' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPrecisePaymentSuggestions(@Query() dto: PrecisePaymentSuggestionsDto) {
    const match = await this.locationPrecisionService.findExactLocationMatch(
      dto.latitude,
      dto.longitude,
      dto.name,
      dto.radius
    );

    return {
      success: true,
      message: match ? 'Exact location match found' : 'No exact location match found',
      data: {
        match,
        suggestions: match?.paymentSuggestions || [],
      },
    };
  }

  @Get('suggestions/nearby')
  @ApiOperation({ 
    summary: 'Get nearby business payment details', 
    description: 'Get nearby locations with business payment details (account numbers, bank names, account names) sorted by distance and confidence. Suggests payment details of businesses that other users have paid to at nearby locations.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Nearby business payment details retrieved successfully' 
  })
  @ApiResponse({ status: 400, description: 'Invalid coordinates' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNearbyPaymentSuggestions(@Query() dto: NearbyPaymentSuggestionsDto) {
    const locations = await this.locationPrecisionService.getNearbyLocationsWithSuggestions(
      dto.latitude,
      dto.longitude,
      dto.radius,
      dto.limit
    );

    return {
      success: true,
      message: 'Nearby business payment details retrieved successfully',
      data: {
        locations,
        total: locations.length,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get location by ID', 
    description: 'Retrieve a specific location by its ID' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Location retrieved successfully', 
    type: LocationResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Location not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getLocation(@Param('id') id: string): Promise<LocationResponseDto> {
    return this.locationService.findLocationById(id);
  }

  @Put(':id')
  @ApiOperation({ 
    summary: 'Update location', 
    description: 'Update an existing location' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Location updated successfully', 
    type: UpdateLocationResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Location not found' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateLocation(
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto
  ): Promise<UpdateLocationResponseDto> {
    const location = await this.locationService.updateLocation(id, dto);
    
    return {
      success: true,
      message: 'Location updated successfully',
      data: location,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Delete location', 
    description: 'Soft delete a location by setting isActive to false' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Location deleted successfully', 
    type: DeleteLocationResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Location not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteLocation(@Param('id') id: string): Promise<DeleteLocationResponseDto> {
    await this.locationService.deleteLocation(id);
    
    return {
      success: true,
      message: 'Location deleted successfully',
    };
  }

  @Get('stats/overview')
  @ApiOperation({ 
    summary: 'Get location statistics', 
    description: 'Get overview statistics of locations and transactions' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Statistics retrieved successfully' 
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getLocationStats() {
    const stats = await this.locationService.getLocationStats();
    
    return {
      success: true,
      message: 'Location statistics retrieved successfully',
      data: stats,
    };
  }
} 
 
 