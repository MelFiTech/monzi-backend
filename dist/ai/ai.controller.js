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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const ai_service_1 = require("./ai.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const ai_dto_1 = require("./dto/ai.dto");
let AiController = class AiController {
    constructor(aiService) {
        this.aiService = aiService;
    }
    async processQuery(aiQueryDto, req) {
        return this.aiService.processQuery(aiQueryDto, req.user.id);
    }
    async getQueryHistory(req) {
        return this.aiService.getQueryHistory(req.user.id);
    }
};
exports.AiController = AiController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Process natural language query about transactions' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Query processed successfully', type: ai_dto_1.TransactionSummaryDto }),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('query'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ai_dto_1.AiQueryDto, Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "processQuery", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get AI query history' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Query history retrieved successfully', type: [ai_dto_1.AiResponseDto] }),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('history'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getQueryHistory", null);
exports.AiController = AiController = __decorate([
    (0, swagger_1.ApiTags)('AI Assistant'),
    (0, common_1.Controller)('ai'),
    __metadata("design:paramtypes", [ai_service_1.AiService])
], AiController);
//# sourceMappingURL=ai.controller.js.map