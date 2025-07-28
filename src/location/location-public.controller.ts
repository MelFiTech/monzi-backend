import { 
  Controller, 
  Get, 
  Query
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LocationPrecisionService } from './services/location-precision.service';
import { 
  PrecisePaymentSuggestionsDto,
  NearbyPaymentSuggestionsDto
} from './dto/location.dto';

@ApiTags('Public Locations')
@Controller('public/locations')
export class LocationPublicController {
  constructor(
    private readonly locationPrecisionService: LocationPrecisionService,
  ) {}

  @Get('suggestions/precise')
  @ApiOperation({ 
    summary: 'Get precise business payment details (Public)', 
    description: 'Get exact location match and business payment details (account number, bank name, account name) based on GPS coordinates. No authentication required. Suggests payment details of businesses that other users have paid to at this location.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Business payment details retrieved successfully' 
  })
  @ApiResponse({ status: 400, description: 'Invalid coordinates' })
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
    summary: 'Get nearby business payment details (Public)', 
    description: 'Get nearby locations with business payment details (account numbers, bank names, account names) sorted by distance and confidence. No authentication required. Suggests payment details of businesses that other users have paid to at nearby locations.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Nearby business payment details retrieved successfully' 
  })
  @ApiResponse({ status: 400, description: 'Invalid coordinates' })
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
} 
 
 