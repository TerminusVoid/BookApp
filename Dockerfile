# Use PHP 8.2 with Apache
FROM php:8.2-apache

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    libzip-dev \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy backend files
COPY backend/ .

# Create startup script
RUN echo '#!/bin/bash' > /usr/local/bin/start.sh && \
    echo 'set -e' >> /usr/local/bin/start.sh && \
    echo 'echo "Starting Laravel application setup..."' >> /usr/local/bin/start.sh && \
    echo 'cd /var/www/html' >> /usr/local/bin/start.sh && \
    echo 'composer dump-autoload --optimize' >> /usr/local/bin/start.sh && \
    echo 'php artisan package:discover --ansi' >> /usr/local/bin/start.sh && \
    echo 'php artisan config:cache' >> /usr/local/bin/start.sh && \
    echo 'php artisan route:cache' >> /usr/local/bin/start.sh && \
    echo 'php artisan view:cache' >> /usr/local/bin/start.sh && \
    echo 'php artisan migrate --force' >> /usr/local/bin/start.sh && \
    echo 'echo "Laravel setup complete, starting Apache..."' >> /usr/local/bin/start.sh && \
    echo 'exec apache2-foreground' >> /usr/local/bin/start.sh && \
    chmod +x /usr/local/bin/start.sh

# Install PHP dependencies (skip scripts to avoid env issues during build)
RUN composer install --no-dev --optimize-autoloader --no-scripts

# Set proper permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html/storage \
    && chmod -R 755 /var/www/html/bootstrap/cache

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Copy Apache configuration
RUN echo '<VirtualHost *:80>\n\
    DocumentRoot /var/www/html/public\n\
    <Directory /var/www/html/public>\n\
        AllowOverride All\n\
        Require all granted\n\
    </Directory>\n\
</VirtualHost>' > /etc/apache2/sites-available/000-default.conf

# Expose port 80
EXPOSE 80

# Start with our custom script
CMD ["/usr/local/bin/start.sh"]
