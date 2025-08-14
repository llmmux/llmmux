#!/bin/bash

# LLMMux Docker Deployment Script
# This script helps deploy LLMMux with authentication features

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to generate random password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Function to generate JWT secret
generate_jwt_secret() {
    openssl rand -base64 64 | tr -d "=+/" | cut -c1-64
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_status "Docker and Docker Compose are installed."
}

# Function to setup environment file
setup_env() {
    if [ ! -f .env ]; then
        print_status "Creating .env file from template..."
        cp .env.example .env
        
        # Generate secure passwords
        MYSQL_ROOT_PASS=$(generate_password)
        MYSQL_USER_PASS=$(generate_password)
        JWT_SECRET=$(generate_jwt_secret)
        
        # Update .env file with generated passwords
        sed -i.bak "s/MYSQL_ROOT_PASSWORD=.*/MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASS}/" .env
        sed -i.bak "s/MYSQL_PASSWORD=.*/MYSQL_PASSWORD=${MYSQL_USER_PASS}/" .env
        sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" .env
        
        # Update DATABASE_URL
        sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=mysql://llmmux_user:${MYSQL_USER_PASS}@localhost:3306/llmmux|" .env
        
        rm .env.bak
        
        print_status "Environment file created with secure passwords."
        print_warning "Please review and customize .env file before continuing."
        print_warning "Generated MySQL root password: ${MYSQL_ROOT_PASS}"
        print_warning "Generated MySQL user password: ${MYSQL_USER_PASS}"
        print_warning "Save these passwords securely!"
    else
        print_status ".env file already exists."
    fi
}

# Function to build Docker image
build_image() {
    print_status "Building LLMMux Docker image..."
    docker build -t llmmux:latest .
    print_status "Docker image built successfully."
}

# Function to start services
start_services() {
    local compose_file=${1:-docker-compose.yml}
    
    print_status "Starting services using ${compose_file}..."
    
    if command -v docker-compose &> /dev/null; then
        docker-compose -f "$compose_file" up -d
    else
        docker compose -f "$compose_file" up -d
    fi
    
    print_status "Services started. Waiting for health checks..."
    sleep 30
    
    # Check service health
    check_health
}

# Function to check service health
check_health() {
    print_status "Checking service health..."
    
    # Check MySQL
    if curl -s http://localhost:8080/healthz > /dev/null; then
        print_status "✓ LLMMux is healthy"
    else
        print_warning "✗ LLMMux health check failed"
    fi
    
    # Check vLLM servers
    if curl -s http://localhost:8000/v1/models > /dev/null; then
        print_status "✓ vLLM Server 1 is healthy"
    else
        print_warning "✗ vLLM Server 1 health check failed"
    fi
    
    if curl -s http://localhost:8001/v1/models > /dev/null; then
        print_status "✓ vLLM Server 2 is healthy"
    else
        print_warning "✗ vLLM Server 2 health check failed"
    fi
}

# Function to create admin user
create_admin() {
    print_status "Creating admin user..."
    
    read -p "Admin username: " admin_username
    read -p "Admin email: " admin_email
    read -s -p "Admin password: " admin_password
    echo
    
    if command -v docker-compose &> /dev/null; then
        docker-compose exec llmmux node -e "
        const { UserService } = require('./dist/auth/user.service');
        const service = new UserService();
        service.createUser({
          username: '${admin_username}',
          email: '${admin_email}',
          password: '${admin_password}',
          role: 'SUPER_ADMIN'
        }).then(() => {
          console.log('Admin user created successfully');
          process.exit(0);
        }).catch(err => {
          console.error('Error creating admin user:', err.message);
          process.exit(1);
        });
        "
    else
        docker compose exec llmmux node -e "
        const { UserService } = require('./dist/auth/user.service');
        const service = new UserService();
        service.createUser({
          username: '${admin_username}',
          email: '${admin_email}',
          password: '${admin_password}',
          role: 'SUPER_ADMIN'
        }).then(() => {
          console.log('Admin user created successfully');
          process.exit(0);
        }).catch(err => {
          console.error('Error creating admin user:', err.message);
          process.exit(1);
        });
        "
    fi
}

# Function to show usage information
show_usage() {
    echo "LLMMux Docker Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  setup           Setup environment and build image"
    echo "  start           Start services (production)"
    echo "  start-dev       Start development environment"
    echo "  start-prod      Start full production environment"
    echo "  stop            Stop all services"
    echo "  build           Build Docker image"
    echo "  admin           Create admin user"
    echo "  health          Check service health"
    echo "  logs            Show service logs"
    echo "  help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup        # Initial setup"
    echo "  $0 start        # Start production services"
    echo "  $0 admin        # Create admin user"
}

# Main script logic
case "$1" in
    "setup")
        check_docker
        setup_env
        build_image
        print_status "Setup complete. Run '$0 start' to start services."
        ;;
    "start")
        start_services "docker-compose.yml"
        ;;
    "start-dev")
        start_services "docker-compose.dev.yml"
        ;;
    "start-prod")
        start_services "docker-compose.prod.yml"
        ;;
    "stop")
        print_status "Stopping services..."
        if command -v docker-compose &> /dev/null; then
            docker-compose down
        else
            docker compose down
        fi
        ;;
    "build")
        build_image
        ;;
    "admin")
        create_admin
        ;;
    "health")
        check_health
        ;;
    "logs")
        if command -v docker-compose &> /dev/null; then
            docker-compose logs -f
        else
            docker compose logs -f
        fi
        ;;
    "help"|"--help"|"-h")
        show_usage
        ;;
    *)
        print_error "Invalid option: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac
