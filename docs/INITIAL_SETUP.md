# Initial Setup Guide

This guide walks you through setting up vLLM Router for the first time, including creating the initial super admin user.

## 🚀 Quick Start

### 1. Environment Configuration

**Required Environment Variables:**

Create a `.env` file in the project root:

```bash
# Database Configuration
DATABASE_URL=mysql://llmmux_user:llmmux_password@localhost:3306/llmmux

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Admin User Configuration (REQUIRED)
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@llmmux.com
ADMIN_PASSWORD=YourSecurePassword123!

# MySQL Database Configuration
MYSQL_ROOT_PASSWORD=llmmux_root_password
MYSQL_DATABASE=llmmux
MYSQL_USER=llmmux_user
MYSQL_PASSWORD=llmmux_password
```

### 2. Database Setup

#### Option A: Docker Compose (Recommended)

```bash
# Start all services including database
docker-compose up -d

# Check logs to ensure admin user was created
docker-compose logs llmmux
```

#### Option B: Manual Setup

```bash
# Install dependencies
npm install

# Start MySQL database
docker run -d --name mysql \
  -e MYSQL_ROOT_PASSWORD=llmmux_root_password \
  -e MYSQL_DATABASE=llmmux \
  -e MYSQL_USER=llmmux_user \
  -e MYSQL_PASSWORD=llmmux_password \
  -p 3306:3306 \
  mysql:8.0

# Run database migrations
npx prisma migrate deploy

# Seed the database with roles
npx prisma db seed

# Create initial admin user
npm run create-admin

# Start the application
npm run start:prod
```

### 3. Initial Login

1. **Access the application**: `http://localhost:8080`
2. **API Documentation**: `http://localhost:8080/api`
3. **Login as super admin**:
   - **Username**: `superadmin`
   - **Email**: `admin@llmmux.com`  
   - **Password**: The value you set in `ADMIN_PASSWORD`

### 4. First Steps After Login

1. **Login to get JWT token**:
   ```bash
   curl -X POST http://localhost:8080/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "username": "superadmin",
       "password": "YourSecurePassword123!"
     }'
   ```

2. **Create your first API key**:
   ```bash
   curl -X POST http://localhost:8080/admin/keys \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Production Key",
       "models": ["llama3.2:latest"],
       "rateLimit": 100
     }'
   ```

3. **Test the API key**:
   ```bash
   curl http://localhost:8080/v1/models \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

## 🔐 Security Best Practices

### Admin Password Requirements

- **Minimum 8 characters**
- **Include uppercase, lowercase, numbers, and symbols**
- **Example**: `MySecureAdmin2024!`

### Environment Variable Security

#### Development
```bash
# .env.development
ADMIN_PASSWORD=DevAdmin123!
JWT_SECRET=dev-jwt-secret-key
```

#### Production
```bash
# .env.production  
ADMIN_PASSWORD=SuperSecureProductionPassword2024!
JWT_SECRET=ultra-secure-jwt-secret-for-production-with-64-chars-minimum
```

#### Docker Secrets (Recommended for Production)
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  llmmux:
    environment:
      - ADMIN_PASSWORD_FILE=/run/secrets/admin_password
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
    secrets:
      - admin_password
      - jwt_secret

secrets:
  admin_password:
    external: true
  jwt_secret:
    external: true
```

### Kubernetes Secrets
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: llmmux-secrets
type: Opaque
data:
  admin-password: <base64-encoded-password>
  jwt-secret: <base64-encoded-secret>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llmmux
spec:
  template:
    spec:
      containers:
      - name: llmmux
        env:
        - name: ADMIN_PASSWORD
          valueFrom:
            secretKeyRef:
              name: llmmux-secrets
              key: admin-password
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: llmmux-secrets
              key: jwt-secret
```

## ❌ Common Issues

### Issue: "ADMIN_PASSWORD environment variable is required"

**Solution**: Set the `ADMIN_PASSWORD` environment variable:
```bash
export ADMIN_PASSWORD="YourSecurePassword123!"
# OR add to your .env file
echo "ADMIN_PASSWORD=YourSecurePassword123!" >> .env
```

### Issue: "SUPER_ADMIN role not found in database"

**Solution**: Run database seeding:
```bash
npx prisma db seed
```

### Issue: "Admin user already exists"

**This is normal** - the system prevents creating duplicate admin users. Use the existing credentials or reset the database if needed.

### Issue: Password too weak

**Solution**: Ensure your password is at least 8 characters:
```bash
# Good examples:
ADMIN_PASSWORD=AdminSecure2024!
ADMIN_PASSWORD=MyCompanyAdmin#123
ADMIN_PASSWORD=SuperUser$ecure789

# Bad examples (will be rejected):
ADMIN_PASSWORD=admin123
ADMIN_PASSWORD=password
```

## 🔄 Password Management

### Changing Admin Password

1. **Login with current credentials**
2. **Use the admin API** to update password:
   ```bash
   curl -X PUT http://localhost:8080/admin/users/1 \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"password": "NewSecurePassword123!"}'
   ```

### Password Recovery

If you forget the admin password:

1. **Stop the application**
2. **Update the environment variable**:
   ```bash
   export ADMIN_PASSWORD="NewPassword123!"
   ```
3. **Delete the existing admin user**:
   ```bash
   npx prisma studio
   # Or use SQL: DELETE FROM users WHERE username = 'superadmin';
   ```
4. **Restart and recreate**:
   ```bash
   npm run create-admin
   ```

## 🎯 Next Steps

After successful setup:

1. **Create additional users** through the admin API
2. **Set up your vLLM backends** in the environment configuration
3. **Configure model routing** and permissions
4. **Set up monitoring** and metrics collection
5. **Review security settings** for your environment

For detailed API documentation, visit `/api` on your running instance.
