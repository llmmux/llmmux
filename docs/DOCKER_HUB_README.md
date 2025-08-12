# LLMMux - Production-Ready LLM Multiplexer

![LLMMux Logo](https://raw.githubusercontent.com/llmmux/llmmux/main/assets/llmmux-logo.png)

🌐 **Official Website**: [llmmux.ai](https://llmmux.ai)  
📧 **Contact**: [contact@llmmux.ai](mailto:contact@llmmux.ai)

## Quick Start

```bash
docker run -d 
  -p 8080:8080 
  -e API_KEYS="your-secret-api-key" 
  -e VLLM_SERVERS="your-vllm-server:8000" 
  llmmux/llmmux:latest
```

## Features

🔗 **OpenAI-Compatible API** - Drop-in replacement for OpenAI endpoints  
🧠 **Function Calling** - Native support with automatic transformation  
🌐 **Multi-Backend Support** - Support for various OpenAI-compatible LLM engines  
📡 **Auto-Discovery** - Automatically detects available models  
💪 **Production-Ready** - Health monitoring, authentication, CORS  
🧪 **Well-Tested** - 78 unit tests across 8 test suites  

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `API_KEYS` | Comma-separated API keys | `sk-key1,sk-key2` |
| `VLLM_SERVERS` | vLLM server addresses | `server1:8000,server2:8001` |
| `BACKENDS` | Manual model configuration | `model:host:port` |
| `PORT` | Server port | `8080` |
| `ENABLE_CORS` | Enable CORS | `true` |

## Health Check

The container includes a built-in health check endpoint at `/healthz`

## Documentation

📚 **Full Documentation**: https://github.com/llmmux/llmmux#readme  
🐛 **Issues**: https://github.com/llmmux/llmmux/issues  
💬 **Discussions**: https://github.com/llmmux/llmmux/discussions  

## Tags

- `latest` - Latest stable release
- `v0.1.0` - Pre-release version
- `dev` - Development builds

---

**License**: Custom License (Free for non-commercial use)  
**Author**: [@ralmalki](https://github.com/ralmalki)  
**Repository**: https://github.com/llmmux/llmmux
