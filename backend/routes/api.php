<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BookController;
use App\Http\Controllers\FavoriteController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Health check endpoint - simple and reliable
Route::get('/health', function () {
    return response('OK', 200)
        ->header('Content-Type', 'text/plain');
});

// Database connection test endpoint
Route::get('/db-test', function () {
    try {
        $pdo = DB::connection()->getPdo();
        $serverInfo = $pdo->getAttribute(PDO::ATTR_SERVER_INFO);
        
        // Test a simple query
        $result = DB::select('SELECT 1 as test');
        
        return response()->json([
            'status' => 'success',
            'message' => 'Database connection working',
            'server_info' => $serverInfo,
            'test_query' => $result[0]->test ?? 'failed',
            'ssl_ca_exists' => file_exists(base_path('aiven-ca.pem')),
            'env_check' => [
                'DB_HOST' => env('DB_HOST'),
                'DB_PORT' => env('DB_PORT'),
                'DB_DATABASE' => env('DB_DATABASE'),
                'DB_USERNAME' => env('DB_USERNAME'),
                'DB_CONNECTION' => env('DB_CONNECTION'),
            ]
        ]);
    } catch (Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage(),
            'ssl_ca_exists' => file_exists(base_path('aiven-ca.pem')),
            'env_check' => [
                'DB_HOST' => env('DB_HOST'),
                'DB_PORT' => env('DB_PORT'),
                'DB_DATABASE' => env('DB_DATABASE'),
                'DB_USERNAME' => env('DB_USERNAME'),
                'DB_CONNECTION' => env('DB_CONNECTION'),
            ]
        ], 500);
    }
});

// Debug endpoint
Route::get('/test', function () {
    return response()->json([
        'status' => 'API is working',
        'timestamp' => now(),
        'method' => request()->method(),
        'url' => request()->fullUrl(),
        'headers' => request()->headers->all(),
    ]);
});

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Book routes (public search, but favorites require auth)
Route::get('/books', [BookController::class, 'index']);
Route::get('/books/search', [BookController::class, 'search']);
Route::get('/books/suggestions', [BookController::class, 'suggestions']);
Route::get('/books/{id}', [BookController::class, 'show']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::delete('/account', [AuthController::class, 'deleteAccount']);
    
    // Favorite routes
    Route::get('/favorites', [FavoriteController::class, 'index']);
    Route::post('/favorites', [FavoriteController::class, 'store']);
    Route::post('/favorites/toggle', [FavoriteController::class, 'toggle']);
    Route::delete('/favorites/{bookId}', [FavoriteController::class, 'destroy']);
});
