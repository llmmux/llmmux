<div align="center">
  <img src="./assets/llmmux-logo.png" alt="LLMMux Logo" width="200" height="200">
  
  # LLMMux
  
  [![Website](https://img.shields.io/badge/Website-llmmux.ai-blue.svg)](https://llmmux.ai)
  [![License: Custom](https://img.shields.io/badge/License-Custom-red.svg)](./LICENSE)
  [![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.1.3-blue.svg)](https://www.typescriptlang.org/)
  [![NestJS](https://img.shields.io/badge/NestJS-10.0.0-red.svg)](https://nestjs.com/)
</div>

A production-ready LLM multiplexer and proxy that provides an OpenAI-compatible API for various LLM backends with advanced features including function calling transformation and health monitoring.

> **Disclaimer**: This project is an independent LLM multiplexer and proxy service. It is not affiliated with or endorsed by any LLM engine providers. All mentioned technologies and trademarks are the property of their respective owners.

## 🚀 Features

- **OpenAI-Compatible API**: Full compatibility with OpenAI's chat completions and models endpoints
- **Multi-Backend Support**: Support for various OpenAI-compatible LLM engines and providers
- **Advanced Authentication**: JWT-based user authentication with role-based access control (USER, ADMIN, SUPER_ADMIN)
- **User Management**: Complete user registration, login, and profile management system
- **API Key Management**: Create and manage API keys with rate limiting and permissions
- **Database Integration**: MySQL/PostgreSQL support for user data and audit logging
- **Function Calling Support**: Native function calling support (tested with Qwen models) + automatic transformation for GPT-OSS models (work in progress)
- **Streaming & Non-Streaming**: Supports both real-time streaming and standard responses
- **Health Monitoring**: Built-in health checks for all backend servers
- **Legacy Auth Support**: Backward compatibility with Bearer token authentication
- **CORS Support**: Configurable cross-origin resource sharing
- **Production-Ready**: Optimized Docker build with health checks, database migrations, and security
- **Audit Logging**: Complete request and user activity logging
- **Comprehensive Testing**: 78 unit tests with 8 test suites covering all major components

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │───▶│     LLMMux      │───▶│   vLLM Server   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                       ┌─────────────────┐
                       │  Transformer    │
                       │  (GPT-OSS Fix)  │
                       └─────────────────┘
```

## 📦 Installation

### Docker (Recommended)

```bash
# Build the image
docker build -t llmmux .

# Run with environment variables
docker run -d \
  -p 8080:8080 \
  -e API_KEYS="your-secret-api-key" \
  -e BACKENDS="qwen3-8b:your-server:8001" \
  --name llmmux \
  llmmux
```

### Local Development

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Start production server
npm run start:prod
```

## ⚙️ Configuration

Create a `.env` file or set environment variables:

```bash
# Server Configuration
NODE_ENV=production
PORT=8080

# API Authentication (comma-separated for multiple keys)
API_KEYS=sk-your-secret-key-1,sk-your-secret-key-2

# Backend Configuration - Choose one method:

# Method 1: Manual Configuration (legacy)
BACKENDS=qwen3-30b:localhost:8000,qwen3-8b:localhost:8001,gpt-oss-20b:localhost:8002

# Method 2: Auto-Discovery (recommended)
# LLMMux will automatically discover available models from vLLM servers
VLLM_SERVERS=localhost:8000,localhost:8001,localhost:8002

# CORS Settings (optional)
ENABLE_CORS=true
CORS_ORIGIN=*

# Health Check Interval (milliseconds)
HEALTH_CHECK_INTERVAL=30000
```

## ✨ Auto-Discovery Feature

LLMMux can automatically discover available models from your vLLM servers without manual configuration:

- **Automatic Model Detection**: Discovers models by querying `/v1/models` on each vLLM server
- **Dynamic Updates**: Periodically checks for new models (configurable interval)
- **Fallback Support**: Falls back to manual `BACKENDS` configuration if discovery fails
- **Health Monitoring**: Tracks discovery status in health checks

**Benefits:**
- No need to manually update configuration when adding/removing models
- Automatically handles model deployments and updates
- Reduces configuration errors
- Supports dynamic scaling of model infrastructure

## 🔌 API Usage

### Chat Completions

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "model": "qwen3-8b",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "stream": false
  }'
```

### Function Calling

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "model": "qwen3-8b",
    "messages": [
      {"role": "user", "content": "What is the weather in Paris?"}
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "Get weather for a location",
          "parameters": {
            "type": "object",
            "properties": {
              "location": {"type": "string"}
            },
            "required": ["location"]
          }
        }
      }
    ]
  }'
```

### Available Models

```bash
curl -H "Authorization: Bearer your-api-key" \
  http://localhost:8080/v1/models
```

### Discovery Management

Check discovery statistics:
```bash
curl -H "Authorization: Bearer your-api-key" \
  http://localhost:8080/v1/models/discovery/stats
```

Force model discovery refresh:
```bash
curl -X POST -H "Authorization: Bearer your-api-key" \
  http://localhost:8080/v1/models/discovery/refresh
```

### Health Check

```bash
curl http://localhost:8080/healthz
```

## 🔧 Advanced Features

### GPT-OSS Function Calling Transformation

⚠️ **Work in Progress**: The proxy includes automatic transformation for GPT-OSS's non-standard function calling format to OpenAI-compatible format. However, this feature is still being refined due to unpredictable responses from GPT-OSS models.

- **Input**: `{"name": "func", "arguments": {...}}` (in content field)
- **Output**: Standard `tool_calls` array format

### Function Calling Support

Native function calling is supported and has been tested with Qwen models. Additional models should be tested and results will be reported as they become available.

### Model Routing

Requests are automatically routed to the correct backend server based on the model name in the request.

### Error Handling

- Graceful error handling with proper HTTP status codes
- Automatic retry logic for backend failures
- Detailed error logging without exposing sensitive information

## 🚀 Deployment

### Quick Start with Authentication

> 📚 **For detailed setup instructions**, see [Initial Setup Guide](./docs/INITIAL_SETUP.md)

```bash
# 1. Clone the repository
git clone https://github.com/llmmux/llmmux.git
cd llmmux

# 2. Configure environment variables (REQUIRED)
cp .env.example .env
# Edit .env and set ADMIN_PASSWORD=YourSecurePassword123!

# 3. Setup and deploy with authentication
./scripts/deploy.sh setup    # Setup environment and build
./scripts/deploy.sh start    # Start all services
./scripts/deploy.sh admin    # Create admin user

# 4. Login and get JWT token
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "superadmin", "password": "YourSecurePassword123!"}'
```

### Docker Compose (Production)

```yaml
version: '3.8'

services:
  # MySQL Database for authentication
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: secure_root_password
      MYSQL_DATABASE: llmmux
      MYSQL_USER: llmmux_user
      MYSQL_PASSWORD: secure_user_password
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - llmmux-network

  # LLMMux with Authentication
  llmmux:
    image: llmmux:latest
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
      # Database for authentication
      - DATABASE_URL=mysql://llmmux_user:secure_user_password@mysql:3306/llmmux
      # JWT authentication
      - JWT_SECRET=your-super-secret-jwt-key-change-in-production
      # Legacy API keys (optional)
      - API_KEYS=sk-your-secret-key-1,sk-your-secret-key-2
      # vLLM backends
      - VLLM_SERVERS=vllm-server-1:8000,vllm-server-2:8000
      - ENABLE_CORS=true
      - CORS_ORIGIN=*
    depends_on:
      mysql:
        condition: service_healthy
    networks:
      - llmmux-network

volumes:
  mysql_data:
networks:
  llmmux-network:
```

### Authentication Methods

LLMMux now supports multiple authentication methods:

1. **JWT Authentication** (Recommended)
   ```bash
   # Login to get token
   curl -X POST http://localhost:8080/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username": "admin", "password": "password"}'
   
   # Use token for API requests
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8080/v1/models
   ```

2. **Legacy API Keys** (Backward compatibility)
   ```bash
   curl -H "Authorization: Bearer sk-your-secret-key-1" \
     http://localhost:8080/v1/models
   ```

### User Management

```bash
# Create admin user
./scripts/deploy.sh admin

# Or manually
docker-compose exec llmmux npm run create-admin

# View users (admin only)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8080/auth/users

# Create new user (admin only)
curl -X POST http://localhost:8080/auth/register \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "user@example.com",
    "password": "secure-password",
    "role": "USER"
  }'
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llmmux
spec:
  replicas: 3
  selector:
    matchLabels:
      app: llmmux
  template:
    metadata:
      labels:
        app: llmmux
    spec:
      containers:
      - name: llmmux
        image: llmmux:latest
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "8080"
        - name: API_KEYS
          valueFrom:
            secretKeyRef:
              name: llmmux-secrets
              key: api-keys
        - name: VLLM_SERVERS
          value: "vllm-service-1:8000,vllm-service-2:8001"
        - name: ENABLE_CORS
          value: "true"
        - name: CORS_ORIGIN
          value: "*"
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

## 📊 Monitoring

The application provides several monitoring endpoints:

- `/healthz` - Overall health status
- Built-in logging with structured output
- Backend server status monitoring
- Request/response metrics

## 🔒 Security

- Bearer token authentication required for all API endpoints
- Non-root user in Docker container
- Minimal attack surface with no debug endpoints in production
- Input validation and sanitization
- Rate limiting ready (add as needed)

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start development server
npm run start:dev

# Build for production
npm run build

# Format code
npm run format

# Lint code
npm run lint

# Run tests
npm test

# Run tests with coverage
npm run test:cov
```

## 🧪 Testing

LLMMux includes comprehensive unit test coverage to ensure reliability and maintainability:

### Test Coverage
- **78 passing tests** across 8 test suites
- **8 major components** fully tested:
  - Configuration Service (20 tests)
  - Model Discovery Service (16 tests) 
  - Health Controller (10 tests)
  - Models Controller (6 tests)
  - Auth Guard (11 tests)
  - Proxy Controller (5 tests)
  - Proxy Service (5 tests)
  - Response Transformer Service (5 tests)

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:cov

# Run specific test file
npm test -- auth.guard.spec.ts
```

The test suite covers:
- ✅ Authentication and authorization flows
- ✅ Backend configuration and model discovery
- ✅ Health monitoring and status checks
- ✅ Request routing and proxy functionality
- ✅ Response transformation for GPT-OSS models
- ✅ Error handling and edge cases

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- How to submit issues and feature requests
- Development setup and guidelines
- Code style and testing requirements
- Pull request process

## 📝 License

This project is licensed under a Custom License that allows free use for non-commercial purposes. See the [LICENSE](LICENSE) file for details.

**Commercial Use**: Requires permission from the author. Please contact contact@llmmux.ai for commercial licensing inquiries.

## 🙏 Acknowledgments

- [vLLM](https://github.com/vllm-project/vllm) - High-throughput LLM inference engine
- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [OpenAI](https://openai.com/) - API compatibility standards

## 📞 Support

- 🌐 **Website**: [llmmux.ai](https://llmmux.ai)
- ✉️ **Contact**: [contact@llmmux.ai](mailto:contact@llmmux.ai)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/llmmux/llmmux/issues)
- 💡 **Feature Requests**: [GitHub Issues](https://github.com/llmmux/llmmux/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/llmmux/llmmux/discussions)

---

⭐ If you find this project helpful, please consider giving it a star on GitHub!

---

**Production Ready** ✅ | **OpenAI Compatible** ✅ | **Function Calling** ✅ | **Health Monitoring** ✅