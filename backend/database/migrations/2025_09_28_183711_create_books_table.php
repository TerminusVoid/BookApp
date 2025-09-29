<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('books', function (Blueprint $table) {
            $table->id();
            $table->string('google_books_id')->unique();
            $table->string('title');
            $table->json('authors')->nullable();
            $table->text('description')->nullable();
            $table->string('publisher')->nullable();
            $table->string('published_date')->nullable();
            $table->integer('page_count')->nullable();
            $table->json('categories')->nullable();
            $table->string('language')->nullable();
            $table->string('isbn_10')->nullable();
            $table->string('isbn_13')->nullable();
            $table->string('thumbnail')->nullable();
            $table->string('small_thumbnail')->nullable();
            $table->decimal('average_rating', 3, 2)->nullable();
            $table->integer('ratings_count')->nullable();
            $table->string('preview_link')->nullable();
            $table->string('info_link')->nullable();
            $table->timestamps();
            
            $table->index('google_books_id');
            $table->index('title');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('books');
    }
};
