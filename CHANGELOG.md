# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-08-12

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

## [1.0.0] - 2025-08-12

### Added
- Initial release of LLMMux
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
