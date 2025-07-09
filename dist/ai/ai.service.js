"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const ai_dto_1 = require("./dto/ai.dto");
const generative_ai_1 = require("@google/generative-ai");
const openai_1 = require("openai");
let AiService = class AiService {
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
        const geminiKey = this.configService.get('GEMINI_API_KEY');
        const openaiKey = this.configService.get('OPENAI_API_KEY');
        if (geminiKey && geminiKey !== 'your-gemini-api-key') {
            this.gemini = new generative_ai_1.GoogleGenerativeAI(geminiKey);
        }
        if (openaiKey && openaiKey !== 'your-openai-api-key') {
            this.openai = new openai_1.default({ apiKey: openaiKey });
        }
    }
    async processQuery(queryDto, userId) {
        const { prompt, model = ai_dto_1.AiModel.GEMINI_PRO } = queryDto;
        const aiQuery = await this.prisma.aiQuery.create({
            data: {
                prompt,
                model,
                status: 'processing',
                userId,
            },
        });
        try {
            const structuredQuery = await this.generateStructuredQuery(prompt, model);
            const transactions = await this.executeQuery(structuredQuery, userId);
            const response = await this.generateResponse(prompt, transactions, model);
            const updatedQuery = await this.prisma.aiQuery.update({
                where: { id: aiQuery.id },
                data: {
                    response,
                    structured: { ...structuredQuery },
                    status: 'completed',
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
        }
        catch (error) {
            await this.prisma.aiQuery.update({
                where: { id: aiQuery.id },
                data: {
                    response: `Error processing query: ${error.message}`,
                    status: 'failed',
                },
            });
            throw new common_1.BadRequestException(`Failed to process query: ${error.message}`);
        }
    }
    async generateStructuredQuery(prompt, model) {
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
        let structuredQuery = {};
        try {
            if (model.includes('gpt') && this.openai) {
                const response = await this.openai.chat.completions.create({
                    model: model,
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
            }
            else if (this.gemini) {
                const model_instance = this.gemini.getGenerativeModel({ model: 'gemini-pro' });
                const result = await model_instance.generateContent(`${systemPrompt}\n\nUser query: ${prompt}`);
                const response = await result.response;
                const content = response.text();
                const jsonMatch = content.match(/\{.*\}/s);
                if (jsonMatch) {
                    structuredQuery = JSON.parse(jsonMatch[0]);
                }
            }
            else {
                structuredQuery = this.parseQueryKeywords(prompt);
            }
        }
        catch (error) {
            console.error('AI parsing failed, using fallback:', error);
            structuredQuery = this.parseQueryKeywords(prompt);
        }
        return structuredQuery;
    }
    parseQueryKeywords(prompt) {
        const query = {};
        const lowerPrompt = prompt.toLowerCase();
        const limitMatch = prompt.match(/(?:last|recent)\s+(\d+)/i);
        if (limitMatch)
            query.limit = parseInt(limitMatch[1]);
        const banks = ['gtbank', 'zenith', 'first bank', 'uba', 'access', 'fidelity'];
        banks.forEach(bank => {
            if (lowerPrompt.includes(bank)) {
                query.bank = bank.replace(/bank$/, '').trim();
            }
        });
        if (lowerPrompt.includes('transfer'))
            query.transactionType = 'TRANSFER';
        else if (lowerPrompt.includes('payment'))
            query.transactionType = 'PAYMENT';
        else if (lowerPrompt.includes('deposit'))
            query.transactionType = 'DEPOSIT';
        else if (lowerPrompt.includes('withdrawal'))
            query.transactionType = 'WITHDRAWAL';
        const amountMatch = prompt.match(/(?:over|above|more than)\s+(\d+)/i);
        if (amountMatch)
            query.minAmount = parseInt(amountMatch[1]);
        return query;
    }
    async executeQuery(structuredQuery, userId) {
        const where = {};
        if (userId)
            where.userId = userId;
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
    async generateResponse(prompt, transactions, model) {
        if (transactions.length === 0) {
            return "I couldn't find any transactions matching your criteria.";
        }
        const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
        const basicResponse = `Found ${transactions.length} transaction(s) totaling ₦${totalAmount.toLocaleString()}. ` +
            transactions.slice(0, 3).map(t => `₦${t.amount.toLocaleString()} ${t.type.toLowerCase()} on ${new Date(t.createdAt).toDateString()}`).join(', ');
        try {
            if (model.includes('gpt') && this.openai) {
                const response = await this.openai.chat.completions.create({
                    model: model,
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
            }
            else if (this.gemini) {
                const model_instance = this.gemini.getGenerativeModel({ model: 'gemini-pro' });
                const result = await model_instance.generateContent(`User asked: "${prompt}". Provide a natural summary of these transactions: ${JSON.stringify(transactions.slice(0, 5))}`);
                const response = await result.response;
                return response.text() || basicResponse;
            }
        }
        catch (error) {
            console.error('AI response generation failed:', error);
        }
        return basicResponse;
    }
    async getQueryHistory(userId) {
        return this.prisma.aiQuery.findMany({
            where: userId ? { userId } : {},
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], AiService);
//# sourceMappingURL=ai.service.js.map