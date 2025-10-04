import { Controller, Get, Post, Body, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { NyraBillService } from './nyra-bill.service';
import { 
  GetDataPlansDto, 
  PurchaseDataDto, 
  PurchaseAirtimeDto, 
  BillHistoryDto,
  BillServiceResponse,
  DataPlanResponse,
  BillPurchaseResponse,
  BillHistoryResponse
} from './dto/bill.dto';

@Controller('bills')
@UseGuards(JwtAuthGuard)
export class NyraBillController {
  constructor(private readonly nyraBillService: NyraBillService) {}

  /**
   * Get all available bill services
   */
  @Get('services')
  async getServices(): Promise<{ success: boolean; data: BillServiceResponse[] }> {
    const services = await this.nyraBillService.getServices();
    return {
      success: true,
      data: services,
    };
  }

  /**
   * Get data plans for a specific network
   */
  @Get('data-plans')
  async getDataPlans(@Query() query: GetDataPlansDto): Promise<{ success: boolean; data: DataPlanResponse[] }> {
    const dataPlans = await this.nyraBillService.getDataPlans(query.network);
    return {
      success: true,
      data: dataPlans,
    };
  }

  /**
   * Purchase data bundle
   */
  @Post('data/purchase')
  @HttpCode(HttpStatus.OK)
  async purchaseData(
    @Request() req: any,
    @Body() purchaseDataDto: PurchaseDataDto,
  ): Promise<{ success: boolean; data: BillPurchaseResponse }> {
    const userId = req.user.id;
    const result = await this.nyraBillService.purchaseData(
      userId,
      purchaseDataDto.phoneNumber,
      purchaseDataDto.bundleId,
      purchaseDataDto.amount,
      purchaseDataDto.pin,
      purchaseDataDto.network,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Purchase airtime
   */
  @Post('airtime/purchase')
  @HttpCode(HttpStatus.OK)
  async purchaseAirtime(
    @Request() req: any,
    @Body() purchaseAirtimeDto: PurchaseAirtimeDto,
  ): Promise<{ success: boolean; data: BillPurchaseResponse }> {
    const userId = req.user.id;
    const result = await this.nyraBillService.purchaseAirtime(
      userId,
      purchaseAirtimeDto.phoneNumber,
      purchaseAirtimeDto.amount,
      purchaseAirtimeDto.pin,
      purchaseAirtimeDto.network,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get user's bill purchase history
   */
  @Get('history')
  async getBillHistory(
    @Request() req: any,
    @Query() query: BillHistoryDto,
  ): Promise<{ success: boolean; data: BillHistoryResponse[] }> {
    const userId = req.user.id;
    const history = await this.nyraBillService.getBillHistory(
      userId,
      query.limit,
      query.offset,
    );

    return {
      success: true,
      data: history,
    };
  }
}
