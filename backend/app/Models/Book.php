<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Book extends Model
{
    protected $fillable = [
        'google_books_id',
        'title',
        'authors',
        'description',
        'publisher',
        'published_date',
        'page_count',
        'categories',
        'language',
        'isbn_10',
        'isbn_13',
        'thumbnail',
        'small_thumbnail',
        'average_rating',
        'ratings_count',
        'preview_link',
        'info_link',
    ];

    protected $casts = [
        'authors' => 'array',
        'categories' => 'array',
        'average_rating' => 'decimal:2',
    ];

    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class);
    }

    public function isFavoritedBy($userId): bool
    {
        return $this->favorites()->where('user_id', $userId)->exists();
    }
}
