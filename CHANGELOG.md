# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-08-14

### Breaking Changes
- **Removed Legacy API Key Support**: Static `API_KEYS` environment variable no longer supported
  - All authentication now uses database-managed API keys only
  - Admin interface required for API key management
  - Enhanced security with JWT tokens for admin authentication

### Added
- **Complete Database Authentication System**
  - MySQL database integration with Prisma ORM
  - JWT-based admin authentication
  - Dynamic API key management with advanced features:
    - Expiration dates and automatic cleanup
    - Rate limiting (requests per minute/day)
    - Model-specific permissions
    - Usage tracking and analytics
    - Owner management and tagging
- **Docker Compose Setup**
  - Production-ready MySQL database configuration
  - Automated database migrations
  - Health checks and proper networking
  - Volume persistence for database data

### Enhanced
- Authentication guard now async for better performance
- Comprehensive API key validation and permissions
- Admin dashboard capabilities for user and key management
- Complete Docker deployment documentation

### Removed
- Static API key configuration (`API_KEYS` environment variable)
- Legacy authentication fallback mechanisms
- Related configuration service methods

## [0.2.0] - 2025-08-12

### Added
- **Auto-Discovery Feature**: Automatic model discovery from vLLM servers
  - New `VLLM_SERVERS` configuration option for automatic model detection
  - Periodic discovery updates every 30 seconds (configurable)
  - Discovery management API endpoints (`/v1/models/discovery/stats`, `/v1/models/discovery/refresh`)
  - Enhanced health checks with discovery statistics
  - Fallback support for manual `BACKENDS` configuration
  - Mixed configuration support (manual + auto-discovery)

### Enhanced
- Configuration service now supports both static and dynamic backends
- Health monitoring includes discovery status and backend statistics
- Models API now shows both manually configured and auto-discovered models
- Improved documentation with auto-discovery examples and best practices

### Technical
- New `ModelDiscoveryService` for managing automatic model detection
- Enhanced `ConfigurationService` with discovery integration
- Updated TypeScript types and interfaces
- Comprehensive test coverage for new features

## [0.1.0] - 2025-08-12

### Added
- Initial pre-release of LLMMux
- LLM multiplexer and proxy with OpenAI-compatible API
- Support for vLLM servers with streaming and non-streaming responses
- Function calling support with automatic transformation for GPT-OSS models
- Native support for Qwen models
- Bearer token authentication with multiple API keys
- Health monitoring for backend servers
- CORS configuration support
- Docker containerization with health checks
- Comprehensive logging and error handling
- Production-ready configuration options
- Custom license allowing non-commercial use (commercial use requires permission)

### Features
- **Proxy Controller**: Routes chat completions and models requests to vLLM backends
- **Response Transformer**: Handles function calling format conversion
- **Auth Guard**: Secure API key validation
- **Health Controller**: Backend server health monitoring
- **Configuration Service**: Environment-based configuration management

### Technical Details
- Built with NestJS and TypeScript
- Supports multiple vLLM backend servers
- Configurable through environment variables
- Comprehensive test coverage
- ESLint and Prettier code formatting
- Docker support with multi-stage builds
