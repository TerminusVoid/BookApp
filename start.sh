#!/bin/sh
set -e

echo "=== Starting Laravel Application ==="

echo "Step 1: Optimizing autoloader..."
composer dump-autoload --optimize || echo "Warning: Autoload optimization failed"

echo "Step 2: Discovering packages..."
php artisan package:discover --ansi || echo "Warning: Package discovery failed"

echo "Step 3: Clearing caches..."
php artisan config:clear || echo "Warning: Config clear failed"
php artisan route:clear || echo "Warning: Route clear failed"  
php artisan view:clear || echo "Warning: View clear failed"

echo "Step 4: Caching configurations..."
php artisan config:cache || echo "Warning: Config cache failed"
php artisan route:cache || echo "Warning: Route cache failed"
php artisan view:cache || echo "Warning: View cache failed"

echo "Step 5: Running migrations..."
php artisan migrate --force || echo "Warning: Migration failed"

echo "Step 6: Testing health endpoint..."
php artisan tinker --execute="echo 'Laravel is ready';" || echo "Warning: Laravel test failed"

echo "Step 7: Starting Apache..."
echo "=== Laravel setup complete, starting web server ==="
exec apache2-foreground
