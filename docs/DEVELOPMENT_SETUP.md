# Development Environment Setup

This guide helps contributors set up their local development environment for LLMMux.

## Local Development Setup

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose
- Git

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/llmmux/llmmux.git
cd llmmux
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment**
```bash
cp .env.example .env
# Edit .env with your local configuration
```

4. **Start development environment**
```bash
# Start database and vLLM servers
docker-compose up -d

# Run database migrations
npm run migrate

# Start development server
npm run start:dev
```

## Environment Files

### For Contributors (.env)
- Copy from `.env.example`
- Configure for local development
- Never commit this file

### For Examples (.env.example)
- Template with all required variables
- Safe default values for development
- Comments explaining each variable
- Committed to repository

### For Testing (.env.test)
- Used by CI/CD and local testing
- Minimal configuration for tests
- Committed to repository

## Branch Structure for Contributors

### Main Branches (Read-Only for Contributors)
- **`main`** - Production releases
- **`develop`** - Integration branch

### Contributor Branches
- **`feature/your-feature`** - New features
- **`fix/your-bugfix`** - Bug fixes
- **`docs/your-docs`** - Documentation

### Workflow for Contributors

1. **Fork the repository**
2. **Clone your fork**
3. **Create feature branch from develop**
```bash
git checkout develop
git pull upstream develop
git checkout -b feature/my-awesome-feature
```
4. **Make changes and commit**
5. **Push to your fork**
6. **Create Pull Request to develop**

## Local Development Commands

```bash
# Development server with hot reload
npm run start:dev

# Run tests
npm test
npm run test:watch
npm run test:e2e

# Build project
npm run build

# Database operations
npm run migrate        # Run migrations
npm run migrate:reset  # Reset database
npm run seed          # Seed test data

# Code quality
npm run lint
npm run lint:fix
npm run format
```

## Docker Development

### Full Stack (Recommended)
```bash
docker-compose up -d
```

### Just Database
```bash
docker-compose up -d mysql
npm run start:dev
```

### Just vLLM Servers
```bash
docker-compose up -d vllm-server-1 vllm-server-2
npm run start:dev
```

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:e2e
```

### With Database
```bash
# Start test database
docker-compose -f docker-compose.test.yml up -d
npm run test:integration
```

## Troubleshooting

### Database Issues
```bash
# Reset database
npm run migrate:reset

# Check database connection
npm run db:status
```

### Docker Issues
```bash
# Clean up containers
docker-compose down -v
docker-compose up -d

# View logs
docker-compose logs -f llmmux
```

### Port Conflicts
Default ports used:
- 8080: LLMMux API
- 3306: MySQL
- 8000, 8001: vLLM servers

Change ports in `.env` if needed.

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `8080` | API server port |
| `DATABASE_URL` | Yes | - | MySQL connection string |
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `VLLM_SERVERS` | No | - | Auto-discovery servers |
| `BACKENDS` | No | - | Manual backend config |
| `ENABLE_CORS` | No | `true` | Enable CORS |
| `CORS_ORIGIN` | No | `*` | CORS allowed origins |
| `LOG_LEVEL` | No | `info` | Logging level |
