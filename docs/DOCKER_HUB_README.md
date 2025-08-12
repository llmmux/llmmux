# LLMMux - Production-Ready LLM Multiplexer

<img src="https://raw.githubusercontent.com/llmmux/llmmux/main/assets/llmmux-logo.png" alt="LLMMux Logo" width="200" height="auto" />

🌐 **Official Website**: [llmmux.ai](https://llmmux.ai)  
📧 **Contact**: [contact@llmmux.ai](mailto:contact@llmmux.ai)

## Quick Start

```bash
# Run LLMMux with your configuration
docker run -d \
  --name llmmux \
  -p 8080:8080 \
  -e API_KEYS="your-secret-api-key" \
  -e VLLM_SERVERS="your-vllm-server:8000" \
  llmmux/llmmux:latest
```

## Available Tags

| Tag | Description | Use Case |
|-----|-------------|----------|
| `latest` | Latest stable release | Production |
| `main` | Latest development build | Testing |
| `v0.1.x` | Specific version | Production pinning |
| `0.1.x-pre` | Pre-release versions | Beta testing |

## Features

✨ **OpenAI-Compatible API** - Drop-in replacement for OpenAI endpoints  
🔧 **Function Calling** - Native support with automatic transformation  
🌐 **Multi-Backend Support** - Support for various OpenAI-compatible LLM engines  
� **Auto-Discovery** - Automatically detects available models from backends  
💪 **Production-Ready** - Built-in health monitoring, authentication, and CORS  
🧪 **Well-Tested** - Comprehensive test coverage (78 unit tests across 8 test suites)  

## Configuration

### Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `API_KEYS` | Comma-separated API keys for authentication | - | `sk-key1,sk-key2` |
| `VLLM_SERVERS` | vLLM server addresses | - | `server1:8000,server2:8001` |
| `BACKENDS` | Manual model configuration | - | `model:host:port` |
| `PORT` | Server port | `8080` | `3000` |
| `ENABLE_CORS` | Enable CORS support | `false` | `true` |

### Docker Compose Example

```yaml
version: '3.8'
services:
  llmmux:
    image: llmmux/llmmux:latest
    ports:
      - "8080:8080"
    environment:
      API_KEYS: "sk-your-secret-key"
      VLLM_SERVERS: "localhost:8000"
      ENABLE_CORS: "true"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Health Monitoring

The container includes built-in health monitoring:

- **Health Endpoint**: `GET /healthz` - Returns container health status
- **Metrics**: Built-in performance and usage metrics
- **Docker Health Check**: Automatic container health verification

## Usage Examples

### Basic Usage
```bash
# Simple setup with one backend
docker run -d \
  -p 8080:8080 \
  -e API_KEYS="sk-your-key" \
  -e VLLM_SERVERS="your-vllm-server:8000" \
  llmmux/llmmux:latest
```

### Production Setup
```bash
# Production setup with multiple backends and health checks
docker run -d \
  --name llmmux-prod \
  --restart unless-stopped \
  -p 8080:8080 \
  -e API_KEYS="sk-prod-key-1,sk-prod-key-2" \
  -e VLLM_SERVERS="backend1:8000,backend2:8000" \
  -e ENABLE_CORS="true" \
  --health-cmd="curl -f http://localhost:8080/healthz || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  llmmux/llmmux:latest
```

## Platform Support

This image supports multiple architectures:
- `linux/amd64` (x86_64)
- `linux/arm64` (ARM64/AArch64)

## Resources & Support

📚 **Documentation**: [github.com/llmmux/llmmux](https://github.com/llmmux/llmmux)  
🐛 **Report Issues**: [github.com/llmmux/llmmux/issues](https://github.com/llmmux/llmmux/issues)  
💬 **Community**: [github.com/llmmux/llmmux/discussions](https://github.com/llmmux/llmmux/discussions)  
📧 **Contact**: [contact@llmmux.ai](mailto:contact@llmmux.ai)

---

**License**: Custom License (Free for non-commercial use)  
**Maintained by**: [@ralmalki](https://github.com/ralmalki)  
**Repository**: [github.com/llmmux/llmmux](https://github.com/llmmux/llmmux)
