# Docker Deployment Guide

This guide covers deploying LLMMux with authentication using Docker and Docker Compose.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- At least 4GB RAM (8GB recommended)
- For GPU support: NVIDIA Docker runtime

## Quick Start

### 1. Environment Setup

Copy the example environment file and customize it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Database Configuration
DATABASE_URL=mysql://llmmux_user:llmmux_password@mysql:3306/llmmux
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# MySQL Configuration
MYSQL_ROOT_PASSWORD=secure_root_password
MYSQL_DATABASE=llmmux
MYSQL_USER=llmmux_user
MYSQL_PASSWORD=secure_user_password

# vLLM Backend Configuration
VLLM_SERVERS=vllm-server-1:8000,vllm-server-2:8000

# CORS and API Configuration
ENABLE_CORS=true
CORS_ORIGIN=*
```

### 2. Production Deployment

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d

# Or use the regular docker-compose.yml
docker-compose up -d
```

### 3. Development Setup

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Watch logs
docker-compose -f docker-compose.dev.yml logs -f llmmux
```

## Architecture

The Docker setup includes:

- **LLMMux**: Main application with authentication
- **MySQL**: Database for user management and API keys
- **vLLM Servers**: Example AI model servers
- **Nginx** (optional): Reverse proxy for production

## Database Management

### Initialize Database

The database will be automatically initialized on first startup. To manually manage:

```bash
# Generate Prisma client
docker-compose exec llmmux npm run prisma:generate

# Run migrations
docker-compose exec llmmux npm run prisma:deploy

# Create admin user
docker-compose exec llmmux npm run create-admin
```

### Database Backup

```bash
# Backup database
docker-compose exec mysql mysqldump -u root -p llmmux > backup.sql

# Restore database
docker-compose exec -T mysql mysql -u root -p llmmux < backup.sql
```

## Authentication Setup

LLMMux uses **database-managed API keys** for authentication:

### Authentication Method

#### Database-Managed API Keys
- **Generated dynamically** through the admin interface
- **Advanced features**: expiration dates, rate limiting, model permissions, usage tracking
- **Persistent storage** in MySQL database
- **Full CRUD operations** via REST API

### 1. Create Admin User

```bash
# Interactive admin creation
docker-compose exec llmmux npm run create-admin

# Or manually
docker-compose exec llmmux node -e "
const { UserService } = require('./dist/auth/user.service');
const service = new UserService();
service.createUser({
  username: 'admin',
  email: 'admin@example.com',
  password: 'secure-password',
  role: 'SUPER_ADMIN'
}).then(console.log);
"
```

### 2. Login and Get Token

```bash
# Login via API
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "secure-password"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "SUPER_ADMIN",
    "isActive": true
  }
}
```

### 3. Use Token for API Requests

```bash
# Use JWT token for admin operations
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8080/admin/api-keys

# Use database-managed API key for model access
curl -H "Authorization: Bearer sk-llmmux-your-generated-key" \
  http://localhost:8080/v1/models
```

## vLLM Configuration

### GPU Support

Enable GPU support by uncommenting the deploy section in docker-compose files:

```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: 1
          capabilities: [gpu]
```

### Custom Models

Replace the default models with your preferred ones:

```yaml
vllm-server-1:
  command: [
    "--model", "your-model/name",
    "--host", "0.0.0.0",
    "--port", "8000",
    "--max-model-len", "2048"
  ]
```

## Monitoring and Logs

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f llmmux
docker-compose logs -f mysql
docker-compose logs -f vllm-server-1
```

### Health Checks

```bash
# Check service health
docker-compose ps

# LLMMux health endpoint
curl http://localhost:8080/healthz

# vLLM health
curl http://localhost:8000/v1/models
```

## Production Considerations

### Security

1. **Change default passwords** in `.env`
2. **Use strong JWT secret** (32+ characters)
3. **Configure CORS** properly for your domain
4. **Use HTTPS** in production (nginx configuration included)
5. **Regular database backups**

### Performance

1. **Resource allocation**: Adjust memory limits based on your models
2. **GPU memory**: Configure `--gpu-memory-utilization` for vLLM
3. **Connection pooling**: MySQL connection limits
4. **Load balancing**: Multiple LLMMux instances behind nginx

### Scaling

```yaml
# Scale specific services
docker-compose up -d --scale vllm-server-1=2

# Or use Docker Swarm for production
docker stack deploy -c docker-compose.prod.yml llmmux
```

## Troubleshooting

### Common Issues

1. **Database connection fails**:
   ```bash
   # Check MySQL logs
   docker-compose logs mysql
   
   # Verify connection
   docker-compose exec llmmux mysqladmin ping -h mysql
   ```

2. **vLLM models fail to load**:
   ```bash
   # Check GPU availability
   docker-compose exec vllm-server-1 nvidia-smi
   
   # Check model download
   docker-compose logs vllm-server-1
   ```

3. **Authentication issues**:
   ```bash
   # Check JWT secret configuration
   docker-compose exec llmmux env | grep JWT_SECRET
   
   # Verify database tables
   docker-compose exec llmmux npx prisma studio
   ```

### Debugging

```bash
# Access container shell
docker-compose exec llmmux sh

# Check application logs
docker-compose exec llmmux npm run start:debug

# Database shell
docker-compose exec mysql mysql -u root -p
```

## Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | MySQL connection string | - | Yes |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `API_KEYS` | Legacy API keys (comma-separated) | - | No |
| `VLLM_SERVERS` | vLLM server endpoints | - | Yes |
| `ENABLE_CORS` | Enable CORS | `false` | No |
| `CORS_ORIGIN` | CORS allowed origins | `*` | No |
| `MYSQL_ROOT_PASSWORD` | MySQL root password | - | Yes |
| `MYSQL_DATABASE` | Database name | `llmmux` | No |
| `MYSQL_USER` | Database user | `llmmux_user` | No |
| `MYSQL_PASSWORD` | Database password | - | Yes |

## Files Reference

- `docker-compose.yml`: Basic production setup
- `docker-compose.prod.yml`: Complete production setup with all options
- `docker-compose.dev.yml`: Development environment
- `Dockerfile`: Multi-stage build with database support
- `.env.example`: Environment variables template
- `prisma/init.sql`: Database initialization script
