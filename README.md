# 🚀 SnapNGo Backend

**AI-Powered Financial Transaction API** built with NestJS, Prisma, and OpenAI/Gemini

## 📋 Overview

SnapNGo Backend is a comprehensive financial transaction management system that combines **OCR image processing**, **AI-powered natural language queries**, and **secure authentication** to provide a seamless money transfer experience.

### 🌟 Key Features

- 🔐 **PIN & Biometric Authentication** - Secure user registration and login
- 📸 **OCR Processing** - Extract transaction data from images
- 🤖 **AI Assistant** - Natural language transaction queries powered by OpenAI/Gemini
- 💳 **Transaction Management** - Send money and track transaction history
- 🏦 **Account Resolution** - Verify and resolve bank account details
- 📚 **Auto-generated Swagger Documentation** - Interactive API explorer
- 🔍 **Chat-style Transaction History** - User-friendly transaction display

## 🏗️ Architecture

### Technology Stack
- **Framework**: NestJS (Node.js)
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT with bcrypt
- **AI Integration**: OpenAI GPT-4 & Google Gemini
- **Documentation**: Swagger/OpenAPI
- **File Upload**: Multer
- **Validation**: class-validator & class-transformer

### Module Structure
```
src/
├── auth/          # User authentication & authorization
├── ocr/           # Image processing & text extraction  
├── ai/            # Natural language query processing
├── transactions/  # Money transfers & transaction history
├── accounts/      # Bank account resolution
└── prisma/        # Database service & utilities
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Yarn package manager
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd snap-backend
```

2. **Install dependencies**
```bash
yarn install
```

3. **Environment Setup**
```bash
# Copy and configure environment variables
cp .env.example .env

# Edit .env with your API keys:
# - GEMINI_API_KEY=your-gemini-api-key
# - OPENAI_API_KEY=your-openai-api-key
# - JWT_SECRET=your-super-secret-key
```

4. **Database Setup**
```bash
# Generate Prisma client and run migrations
npx prisma migrate dev
npx prisma generate
```

5. **Start the development server**
```bash
yarn start:dev
```

The API will be available at:
- **API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api

## 📖 Implementation Guide

### 1. Authentication Flow

#### Register a New User
```bash
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "phone": "+2348123456789",
  "pin": "123456"
}
```

#### Login
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com", 
  "pin": "123456"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "isVerified": false
  }
}
```

### 2. OCR Processing

#### Upload and Process Image
```bash
POST /ocr/upload
Authorization: Bearer <your_token>
Content-Type: multipart/form-data

# Upload an image file containing transaction details
```

#### Extract Text Directly
```bash
POST /ocr/extract  
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "rawText": "Transfer to John Doe Account: 1234567890 Amount: 50000 Bank: GTBank",
  "confidence": 0.95
}
```

### 3. AI-Powered Queries

#### Natural Language Transaction Search
```bash
POST /ai/query
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "prompt": "Show my last 3 GTBank transfers",
  "model": "gemini-pro"
}
```

**Example Prompts:**
- `"Show my last 5 transactions"`
- `"Find payments over 10,000 naira"`
- `"Total amount spent this month"`
- `"Transfers to John in December"`
- `"All GTBank transactions"`

**Response:**
```json
{
  "id": "query_id",
  "prompt": "Show my last 3 GTBank transfers", 
  "response": "Found 3 GTBank transfers totaling ₦150,000...",
  "results": {
    "totalTransactions": 3,
    "totalAmount": 150000,
    "currency": "NGN",
    "transactions": [...],
    "summary": "You made 3 transfers to GTBank accounts..."
  }
}
```

### 4. Account Resolution

#### Resolve Bank Account
```bash
POST /accounts/resolve
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "accountNumber": "1234567890",
  "bankCode": "058"
}
```

### 5. Transaction Management

#### Send Money
```bash
POST /transactions/send
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "amount": 50000,
  "description": "Transfer to John Doe",
  "type": "TRANSFER", 
  "toAccountNumber": "1234567890",
  "toBankName": "GTBank"
}
```

#### Get Transaction History
```bash
GET /transactions/history
Authorization: Bearer <your_token>
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | SQLite database file path | ✅ |
| `JWT_SECRET` | Secret key for JWT tokens | ✅ |
| `JWT_EXPIRATION` | Token expiration time | ❌ |
| `OPENAI_API_KEY` | OpenAI API key for GPT models | ❌ |
| `GEMINI_API_KEY` | Google Gemini API key | ❌ |
| `PORT` | Server port (default: 3000) | ❌ |

### Database Schema

The application uses the following key models:

- **User**: Authentication and profile data
- **Account**: Bank account information  
- **Transaction**: Money transfer records
- **OcrScan**: Image processing results
- **AiQuery**: Natural language query logs

## 📊 API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login  
- `POST /auth/biometric-login` - Biometric authentication
- `POST /auth/verify-pin` - Verify user PIN
- `GET /auth/profile` - Get current user profile

### OCR Processing  
- `POST /ocr/upload` - Upload image for processing
- `POST /ocr/extract` - Process raw OCR text
- `GET /ocr/history` - Get OCR scan history
- `GET /ocr/:id` - Get specific OCR scan

### AI Assistant
- `POST /ai/query` - Process natural language query
- `GET /ai/history` - Get query history

### Transactions
- `POST /transactions/send` - Send money
- `GET /transactions/history` - Get transaction history  
- `GET /transactions/:id` - Get specific transaction

### Accounts
- `POST /accounts/resolve` - Resolve bank account details
- `GET /accounts` - Get saved accounts

## 🧪 Testing

```bash
# Unit tests
yarn test

# E2E tests  
yarn test:e2e

# Test coverage
yarn test:cov
```

## 🐳 Docker Support

```bash
# Build Docker image
docker build -t snap-backend .

# Run with Docker Compose
docker-compose up -d
```

## 📈 Performance & Scaling

### Optimizations Implemented
- ✅ Prisma connection pooling
- ✅ JWT token caching
- ✅ Request validation & sanitization
- ✅ Error handling & logging
- ✅ File upload limits & validation

### Recommended Production Setup
- Use PostgreSQL instead of SQLite
- Implement Redis for caching
- Add rate limiting
- Set up proper logging (Winston)
- Configure monitoring (Prometheus/Grafana)

## 🔒 Security Features

- **PIN Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Stateless token-based auth
- **Request Validation**: Input sanitization & validation
- **File Upload Security**: Type & size restrictions
- **Environment Variables**: Sensitive data protection

## 🚀 Deployment

### Railway/Heroku
```bash
# Build command
yarn build

# Start command  
yarn start:prod
```

### Environment Setup
```bash
# Production environment variables
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=your-super-secure-secret
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **NestJS Team** for the amazing framework
- **Prisma** for the excellent ORM
- **OpenAI & Google** for AI capabilities  
- **Nigerian Banking Industry** for API standards

---

**Built with ❤️ for the Nigerian fintech ecosystem**

For more information, visit the [API Documentation](http://localhost:3000/api) when running locally.
