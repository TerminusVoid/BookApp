#!/bin/sh
set -e

echo "Starting Laravel setup..."

# Laravel setup
composer dump-autoload --optimize
php artisan package:discover --ansi

# Force remove cached config files
rm -f bootstrap/cache/config.php
rm -f bootstrap/cache/routes.php
rm -f bootstrap/cache/services.php

# Clear all caches first to ensure fresh config
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear

# Then cache with fresh environment variables
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "Debug: Environment variables..."
echo "DB_HOST from env: $(printenv DB_HOST)"
echo "DB_PORT from env: $(printenv DB_PORT)"
echo "DB_DATABASE from env: $(printenv DB_DATABASE)"
echo "DB_USERNAME from env: $(printenv DB_USERNAME)"

echo "Testing database connection..."
php artisan tinker --execute="
echo 'Laravel config values:';
echo 'DB_HOST: ' . config('database.connections.mysql.host');
echo 'DB_PORT: ' . config('database.connections.mysql.port');
echo 'DB_DATABASE: ' . config('database.connections.mysql.database');
echo 'DB_USERNAME: ' . config('database.connections.mysql.username');
echo 'Environment values:';
echo 'DB_HOST env: ' . env('DB_HOST');
echo 'DB_PORT env: ' . env('DB_PORT');
echo 'DB_DATABASE env: ' . env('DB_DATABASE');
echo 'DB_USERNAME env: ' . env('DB_USERNAME');
try {
    \$pdo = DB::connection()->getPdo();
    echo 'Database connection: SUCCESS';
    echo 'Connected to: ' . \$pdo->getAttribute(PDO::ATTR_SERVER_INFO);
} catch (Exception \$e) {
    echo 'Database connection FAILED: ' . \$e->getMessage();
}
"

echo "Running migrations..."
php artisan migrate --force

# Configure Apache for Railway's PORT
sed -i "s/PORT_PLACEHOLDER/$PORT/g" /etc/apache2/sites-available/000-default.conf
echo "Listen $PORT" > /etc/apache2/ports.conf
echo "ServerName localhost" >> /etc/apache2/apache2.conf

echo "Starting Apache..."
exec apache2-foreground
