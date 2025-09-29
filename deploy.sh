#!/bin/bash

# BookDiscover Deployment Script
# This script helps deploy the application to production

set -e

echo "🚀 Starting BookDiscover Deployment..."

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

# Check if we're in the right directory
if [ ! -f "README.md" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    print_error "Please run this script from the BookApp root directory"
    exit 1
fi

# Parse command line arguments
ENVIRONMENT=${1:-production}
SKIP_FRONTEND=${2:-false}
SKIP_BACKEND=${3:-false}

print_status "Deploying to environment: $ENVIRONMENT"

# Backend Deployment
if [ "$SKIP_BACKEND" != "true" ]; then
    print_status "Deploying Backend (Laravel)..."
    
    cd backend
    
    # Install/update composer dependencies
    print_status "Installing PHP dependencies..."
    if [ "$ENVIRONMENT" = "production" ]; then
        composer install --optimize-autoloader --no-dev --no-interaction
    else
        composer install --optimize-autoloader --no-interaction
    fi
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Copying from .env.example..."
        cp .env.example .env
        print_warning "Please update .env file with your configuration before continuing"
        read -p "Press enter to continue after updating .env file..."
    fi
    
    # Generate application key if not set
    if ! grep -q "APP_KEY=base64:" .env; then
        print_status "Generating application key..."
        php artisan key:generate --force
    fi
    
    # Run database migrations
    print_status "Running database migrations..."
    php artisan migrate --force
    
    # Clear and cache configuration for production
    if [ "$ENVIRONMENT" = "production" ]; then
        print_status "Optimizing for production..."
        php artisan config:cache
        php artisan route:cache
        php artisan view:cache
        php artisan event:cache
    else
        print_status "Clearing caches for development..."
        php artisan config:clear
        php artisan route:clear
        php artisan view:clear
        php artisan cache:clear
    fi
    
    # Set proper permissions
    print_status "Setting file permissions..."
    chmod -R 755 storage bootstrap/cache
    
    cd ..
    print_status "Backend deployment completed!"
fi

# Frontend Deployment
if [ "$SKIP_FRONTEND" != "true" ]; then
    print_status "Deploying Frontend (React)..."
    
    cd frontend
    
    # Install/update npm dependencies
    print_status "Installing Node.js dependencies..."
    npm ci
    
    # Build for production
    if [ "$ENVIRONMENT" = "production" ]; then
        print_status "Building for production..."
        npm run build
        
        print_status "Frontend built successfully!"
        print_status "Deploy the 'dist' folder to your web server"
    else
        print_status "Starting development server..."
        print_warning "Development server will start. Press Ctrl+C to stop."
        npm run dev
    fi
    
    cd ..
    print_status "Frontend deployment completed!"
fi

# Final instructions
print_status "Deployment completed successfully! 🎉"

if [ "$ENVIRONMENT" = "production" ]; then
    echo ""
    print_status "Production Deployment Checklist:"
    echo "  ✅ Backend deployed to web server"
    echo "  ✅ Frontend built (deploy 'frontend/dist' folder)"
    echo "  ⚠️  Configure web server (Apache/Nginx)"
    echo "  ⚠️  Set up SSL certificate"
    echo "  ⚠️  Configure domain DNS"
    echo "  ⚠️  Set up monitoring and backups"
    echo ""
    print_warning "Don't forget to:"
    echo "  - Update FRONTEND_URL in backend .env"
    echo "  - Update API_BASE_URL in frontend if needed"
    echo "  - Configure CORS settings"
    echo "  - Set up database backups"
    echo "  - Configure log rotation"
else
    echo ""
    print_status "Development servers should be running:"
    echo "  🌐 Frontend: http://localhost:5173"
    echo "  🔧 Backend API: http://localhost:8000"
    echo ""
    print_status "To start servers manually:"
    echo "  Backend:  cd backend && php artisan serve"
    echo "  Frontend: cd frontend && npm run dev"
fi

echo ""
print_status "Happy coding! 📚✨"
