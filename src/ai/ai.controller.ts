import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiQueryDto, AiResponseDto, TransactionSummaryDto } from './dto/ai.dto';

@ApiTags('AI Assistant')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @ApiOperation({ summary: 'Process natural language query about transactions' })
  @ApiResponse({ status: 201, description: 'Query processed successfully', type: TransactionSummaryDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('query')
  async processQuery(@Body() aiQueryDto: AiQueryDto, @Request() req) {
    return this.aiService.processQuery(aiQueryDto, req.user.id);
  }

  @ApiOperation({ summary: 'Get AI query history' })
  @ApiResponse({ status: 200, description: 'Query history retrieved successfully', type: [AiResponseDto] })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getQueryHistory(@Request() req) {
    return this.aiService.getQueryHistory(req.user.id);
  }
}
