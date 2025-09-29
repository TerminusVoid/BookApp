<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\Favorite;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class FavoriteController extends Controller
{

    public function index(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'page' => 'integer|min:1',
            'per_page' => 'integer|min:1|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        $perPage = $request->input('per_page', 20);
        
        $favorites = $request->user()
            ->favoriteBooks()
            ->orderBy('favorites.created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => [
                'books' => $favorites->items(),
                'pagination' => [
                    'current_page' => $favorites->currentPage(),
                    'per_page' => $favorites->perPage(),
                    'total' => $favorites->total(),
                    'total_pages' => $favorites->lastPage(),
                ],
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'book_id' => 'required|exists:books,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        $userId = $request->user()->id;
        $bookId = $request->input('book_id');

        // Check if already favorited
        $existingFavorite = Favorite::where('user_id', $userId)
            ->where('book_id', $bookId)
            ->first();

        if ($existingFavorite) {
            return response()->json([
                'success' => false,
                'message' => 'Book is already in favorites',
            ], 409);
        }

        $favorite = Favorite::create([
            'user_id' => $userId,
            'book_id' => $bookId,
        ]);

        $book = Book::find($bookId);

        return response()->json([
            'success' => true,
            'message' => 'Book added to favorites',
            'data' => [
                'favorite' => $favorite,
                'book' => $book,
            ],
        ], 201);
    }

    public function destroy(Request $request, int $bookId): JsonResponse
    {
        $userId = $request->user()->id;

        $favorite = Favorite::where('user_id', $userId)
            ->where('book_id', $bookId)
            ->first();

        if (!$favorite) {
            return response()->json([
                'success' => false,
                'message' => 'Favorite not found',
            ], 404);
        }

        $favorite->delete();

        return response()->json([
            'success' => true,
            'message' => 'Book removed from favorites',
        ]);
    }

    public function toggle(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'book_id' => 'required|exists:books,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        $userId = $request->user()->id;
        $bookId = $request->input('book_id');

        $favorite = Favorite::where('user_id', $userId)
            ->where('book_id', $bookId)
            ->first();

        if ($favorite) {
            // Remove from favorites
            $favorite->delete();
            $isFavorited = false;
            $message = 'Book removed from favorites';
        } else {
            // Add to favorites
            Favorite::create([
                'user_id' => $userId,
                'book_id' => $bookId,
            ]);
            $isFavorited = true;
            $message = 'Book added to favorites';
        }

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => [
                'is_favorited' => $isFavorited,
            ],
        ]);
    }
}
