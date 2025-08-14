# vLLM Router v0.3.0 Release Notes

## 🎯 Major Features

### **Database-Managed API Keys**
- **Complete authentication overhaul**: All API keys are now managed through a MySQL database with Prisma ORM
- **Dynamic key management**: Create, update, delete, and monitor API keys through REST endpoints
- **Advanced key features**:
  - Configurable expiration dates with automatic cleanup
  - Per-key rate limiting (requests per minute/day)
  - Model-specific access permissions
  - Usage tracking and analytics
  - Owner management and key tagging

### **Admin Authentication System**
- **JWT-based admin access**: Secure token-based authentication for administrative operations
- **Role-based permissions**: Admin and Super Admin roles with granular access control
- **User management**: REST API for user registration, login, and profile management
- **Session management**: Secure login/logout with token-based sessions

### **Production-Ready Deployment**
- **Docker Compose integration**: Complete MySQL database setup with health checks
- **Automated migrations**: Database schema migrations with seeding scripts
- **Multi-environment support**: Separate configurations for development, staging, and production
- **Health monitoring**: Comprehensive health checks for database and application services

## 🔧 REST API Endpoints

### Authentication Endpoints
- `POST /auth/login` - User authentication with JWT tokens
- `GET /auth/profile` - Get current user profile
- `POST /auth/register` - Create new users (Admin only)
- `GET /auth/users` - List all users (Admin only)

### API Key Management
- `GET /admin/keys` - List all API keys with statistics
- `GET /admin/keys/:id` - Get specific key details with metrics
- `POST /admin/keys` - Create new API keys with custom configurations
- `PUT /admin/keys/:id` - Update existing API key settings
- `DELETE /admin/keys/:id` - Delete API keys

### Metrics & Analytics
- `GET /admin/metrics` - System-wide usage metrics
- `GET /admin/metrics/:keyId` - Per-key usage analytics

## ⚠️ Breaking Changes

### **API_KEYS Environment Variable Removed**
- **Legacy support discontinued**: The `API_KEYS` environment variable is no longer supported
- **Migration required**: All existing static API keys must be migrated to the database
- **New setup process**: Database initialization required for all new installations

### **Authentication Changes**
- **Database dependency**: Application now requires MySQL database connection
- **Admin setup**: Initial admin user must be created before API key management
- **Environment cleanup**: Legacy environment variables removed from all configuration files

## 📦 Migration Guide

### For New Installations
1. **Set up database**: Use Docker Compose or configure MySQL manually
2. **Run migrations**: Database schema will be created automatically
3. **Create admin user**: Use the provided script to create your first admin
4. **Generate API keys**: Use admin endpoints to create API keys for your applications

### For Existing Users
1. **Backup your data**: Save your current API keys and configurations
2. **Update deployment**: Switch to new Docker Compose setup with database
3. **Migrate API keys**: Recreate your API keys through the admin interface
4. **Update applications**: Replace static API keys with database-generated ones
5. **Remove legacy config**: Clean up old `API_KEYS` environment variables

## 🛠️ Technical Improvements

- **Async authentication**: Performance improvements with fully async authentication guards
- **Enhanced validation**: Comprehensive input validation with detailed error responses
- **Improved logging**: Better request tracking and error reporting
- **Docker optimization**: Multi-stage builds and optimized container images
- **Test coverage**: Updated test suites covering new authentication architecture

## 📚 Documentation

- **Docker deployment guide**: Complete setup instructions for production environments
- **API documentation**: OpenAPI/Swagger specifications for all endpoints
- **Migration handbook**: Step-by-step upgrade instructions
- **Development workflow**: Open source contribution guidelines and Git workflow

## 🔗 Requirements

- **Node.js**: v18+ (recommended v20+)
- **MySQL**: v8.0+
- **Docker**: v20.10+ (optional but recommended)
- **Memory**: Minimum 1GB RAM for basic operations

---

**Full Changelog**: https://github.com/your-org/vllm-router/compare/v0.2.0...v0.3.0

For technical support and migration assistance, please refer to our documentation or open an issue on GitHub.
