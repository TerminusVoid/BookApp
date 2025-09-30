#!/bin/sh
set -e

# Laravel setup
composer dump-autoload --optimize
php artisan package:discover --ansi
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
    echo 'DB_HOST: ' . env('DB_HOST');
    echo 'DB_PORT: ' . env('DB_PORT');
    echo 'DB_DATABASE: ' . env('DB_DATABASE');
    echo 'DB_USERNAME: ' . env('DB_USERNAME');
    echo 'SSL CA file exists: ' . (file_exists(base_path('aiven-ca.pem')) ? 'YES' : 'NO');
}
"

echo "Running migrations..."
php artisan migrate --force

# Configure Apache for Railway's PORT
sed -i "s/PORT_PLACEHOLDER/$PORT/g" /etc/apache2/sites-available/000-default.conf
echo "Listen $PORT" > /etc/apache2/ports.conf
echo "ServerName localhost" >> /etc/apache2/apache2.conf

# Start Apache
exec apache2-foreground
