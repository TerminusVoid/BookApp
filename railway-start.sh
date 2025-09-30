#!/bin/sh
set -e

echo "Starting MariaDB and configuring database..."

# Start MariaDB service
service mariadb start

# Wait for MariaDB to be ready
sleep 5

# Create database and user
mariadb -u root -e "CREATE DATABASE IF NOT EXISTS bookapp;"
mariadb -u root -e "CREATE USER IF NOT EXISTS 'bookapp'@'localhost' IDENTIFIED BY 'bookapp123';"
mariadb -u root -e "GRANT ALL PRIVILEGES ON bookapp.* TO 'bookapp'@'localhost';"
mariadb -u root -e "FLUSH PRIVILEGES;"

echo "MariaDB setup complete. Starting Laravel setup..."

# Laravel setup
composer dump-autoload --optimize
php artisan package:discover --ansi

# Clear all caches first to ensure fresh config
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear

# Then cache with fresh environment variables
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "Testing database connection..."
php artisan tinker --execute="
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

echo "Starting services with supervisor..."

# Stop MariaDB service (supervisor will manage it)
service mariadb stop

# Start supervisor to manage both MariaDB and Apache
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
