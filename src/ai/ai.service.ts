import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AiQueryDto, StructuredQueryDto, AiModel } from './dto/ai.dto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private gemini: GoogleGenerativeAI;
  private openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Initialize AI clients
    const geminiKey = this.configService.get('GEMINI_API_KEY');
    const openaiKey = this.configService.get('OPENAI_API_KEY');

    if (geminiKey && geminiKey !== 'your-gemini-api-key') {
      this.gemini = new GoogleGenerativeAI(geminiKey);
    }

    if (openaiKey && openaiKey !== 'your-openai-api-key') {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }
  }

  async processQuery(queryDto: AiQueryDto, userId?: string) {
    const { prompt, model = AiModel.GEMINI_PRO } = queryDto;

    // Store the query
    const aiQuery = await this.prisma.aiQuery.create({
      data: {
        prompt,
        model,
        status: 'PROCESSING',
        userId,
      },
    });

    try {
      // Generate structured query using AI
      const structuredQuery = await this.generateStructuredQuery(prompt, model);
      
      // Execute the query against the database
      const transactions = await this.executeQuery(structuredQuery, userId);
      
      // Generate a natural language response
      const response = await this.generateResponse(prompt, transactions, model);

      // Update the AI query record
      const updatedQuery = await this.prisma.aiQuery.update({
        where: { id: aiQuery.id },
        data: {
          response,
          structured: { ...structuredQuery } as any,
          status: 'COMPLETED',
        },
      });

      return {
        ...updatedQuery,
        results: {
          totalTransactions: transactions.length,
          totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
          currency: 'NGN',
          transactions,
          summary: response,
        },
      };
    } catch (error) {
      await this.prisma.aiQuery.update({
        where: { id: aiQuery.id },
        data: {
          response: `Error processing query: ${error.message}`,
          status: 'FAILED',
        },
      });
      throw new BadRequestException(`Failed to process query: ${error.message}`);
    }
  }

  private async generateStructuredQuery(prompt: string, model: AiModel): Promise<StructuredQueryDto> {
    const systemPrompt = `
You are a financial transaction query parser. Convert natural language queries into structured database filters.
Return ONLY a valid JSON object with these possible fields:
- bank: string (bank name)
- transactionType: 'TRANSFER' | 'PAYMENT' | 'DEPOSIT' | 'WITHDRAWAL'
- limit: number (max results)
- minAmount: number
- maxAmount: number
- startDate: string (YYYY-MM-DD)
- endDate: string (YYYY-MM-DD)
- recipient: string (recipient name)

Examples:
"Show my last 3 GTBank transfers" -> {"bank": "GTBank", "transactionType": "TRANSFER", "limit": 3}
"Find payments over 10000 to John" -> {"transactionType": "PAYMENT", "minAmount": 10000, "recipient": "John"}
    `;

    let structuredQuery: StructuredQueryDto = {};

    try {
      if (model.includes('gpt') && this.openai) {
        const response = await this.openai.chat.completions.create({
          model: model as any,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1,
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          structuredQuery = JSON.parse(content);
        }
      } else if (this.gemini) {
        const model_instance = this.gemini.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model_instance.generateContent(`${systemPrompt}\n\nUser query: ${prompt}`);
        const response = await result.response;
        const content = response.text();
        
        // Extract JSON from response
        const jsonMatch = content.match(/\{.*\}/s);
        if (jsonMatch) {
          structuredQuery = JSON.parse(jsonMatch[0]);
        }
      } else {
        // Fallback: simple keyword-based parsing
        structuredQuery = this.parseQueryKeywords(prompt);
      }
    } catch (error) {
      console.error('AI parsing failed, using fallback:', error);
      structuredQuery = this.parseQueryKeywords(prompt);
    }

    return structuredQuery;
  }

  private parseQueryKeywords(prompt: string): StructuredQueryDto {
    const query: StructuredQueryDto = {};
    const lowerPrompt = prompt.toLowerCase();

    // Extract limit
    const limitMatch = prompt.match(/(?:last|recent)\s+(\d+)/i);
    if (limitMatch) query.limit = parseInt(limitMatch[1]);

    // Extract bank
    const banks = ['gtbank', 'zenith', 'first bank', 'uba', 'access', 'fidelity'];
    banks.forEach(bank => {
      if (lowerPrompt.includes(bank)) {
        query.bank = bank.replace(/bank$/, '').trim();
      }
    });

    // Extract transaction type
    if (lowerPrompt.includes('transfer')) query.transactionType = 'TRANSFER';
    else if (lowerPrompt.includes('payment')) query.transactionType = 'PAYMENT';
    else if (lowerPrompt.includes('deposit')) query.transactionType = 'DEPOSIT';
    else if (lowerPrompt.includes('withdrawal')) query.transactionType = 'WITHDRAWAL';

    // Extract amount
    const amountMatch = prompt.match(/(?:over|above|more than)\s+(\d+)/i);
    if (amountMatch) query.minAmount = parseInt(amountMatch[1]);

    return query;
  }

  private async executeQuery(structuredQuery: StructuredQueryDto, userId?: string) {
    const where: any = {};

    if (userId) where.userId = userId;

    // Apply filters from structured query
    if (structuredQuery.transactionType) {
      where.type = structuredQuery.transactionType;
    }

    if (structuredQuery.minAmount) {
      where.amount = { ...where.amount, gte: structuredQuery.minAmount };
    }

    if (structuredQuery.maxAmount) {
      where.amount = { ...where.amount, lte: structuredQuery.maxAmount };
    }

    if (structuredQuery.startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(structuredQuery.startDate) };
    }

    if (structuredQuery.endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(structuredQuery.endDate) };
    }

    if (structuredQuery.bank) {
      where.OR = [
        { fromAccount: { bankName: { contains: structuredQuery.bank, mode: 'insensitive' } } },
        { toAccount: { bankName: { contains: structuredQuery.bank, mode: 'insensitive' } } },
      ];
    }

    if (structuredQuery.recipient) {
      where.description = { contains: structuredQuery.recipient, mode: 'insensitive' };
    }

    return this.prisma.transaction.findMany({
      where,
      take: structuredQuery.limit || 10,
      orderBy: { createdAt: 'desc' },
      include: {
        fromAccount: true,
        toAccount: true,
      },
    });
  }

  private async generateResponse(prompt: string, transactions: any[], model: AiModel): Promise<string> {
    if (transactions.length === 0) {
      return "I couldn't find any transactions matching your criteria.";
    }

    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    
    const basicResponse = `Found ${transactions.length} transaction(s) totaling ₦${totalAmount.toLocaleString()}. ` +
      transactions.slice(0, 3).map(t => 
        `₦${t.amount.toLocaleString()} ${t.type.toLowerCase()} on ${new Date(t.createdAt).toDateString()}`
      ).join(', ');

    try {
      if (model.includes('gpt') && this.openai) {
        const response = await this.openai.chat.completions.create({
          model: model as any,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful financial assistant. Provide a natural, conversational summary of transaction data.',
            },
            {
              role: 'user',
              content: `User asked: "${prompt}". Here's the data: ${JSON.stringify(transactions.slice(0, 5))}. Provide a helpful summary.`,
            },
          ],
          temperature: 0.7,
          max_tokens: 200,
        });

        return response.choices[0]?.message?.content || basicResponse;
      } else if (this.gemini) {
        const model_instance = this.gemini.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model_instance.generateContent(
          `User asked: "${prompt}". Provide a natural summary of these transactions: ${JSON.stringify(transactions.slice(0, 5))}`
        );
        const response = await result.response;
        return response.text() || basicResponse;
      }
    } catch (error) {
      console.error('AI response generation failed:', error);
    }

    return basicResponse;
  }

  async getQueryHistory(userId?: string) {
    return this.prisma.aiQuery.findMany({
      where: userId ? { userId } : {},
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
