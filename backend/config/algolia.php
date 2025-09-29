<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Algolia Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for Algolia search integration.
    |
    */

    'app_id' => env('ALGOLIA_APP_ID', ''),
    'secret' => env('ALGOLIA_SECRET', ''),
    'search_key' => env('ALGOLIA_SEARCH_KEY', ''),

    /*
    |--------------------------------------------------------------------------
    | Indices Configuration
    |--------------------------------------------------------------------------
    |
    | Define the Algolia indices used by the application.
    |
    */

    'indices' => [
        'books' => [
            'name' => env('ALGOLIA_BOOKS_INDEX', 'books'),
            'settings' => [
                'searchableAttributes' => [
                    'title',
                    'authors',
                    'description',
                    'categories',
                    'publisher',
                    'isbn_10',
                    'isbn_13',
                ],
                'attributesForFaceting' => [
                    'categories',
                    'authors',
                    'publisher',
                    'language',
                    'published_year',
                    'rating_range',
                ],
                'customRanking' => [
                    'desc(average_rating)',
                    'desc(ratings_count)',
                    'desc(published_date)',
                ],
                'attributesToRetrieve' => [
                    'id',
                    'google_books_id',
                    'title',
                    'authors',
                    'description',
                    'categories',
                    'publisher',
                    'published_date',
                    'page_count',
                    'language',
                    'isbn_10',
                    'isbn_13',
                    'thumbnail',
                    'preview_link',
                    'info_link',
                    'average_rating',
                    'ratings_count',
                ],
                'attributesToHighlight' => [
                    'title',
                    'authors',
                    'description',
                ],
                'attributesToSnippet' => [
                    'description:100',
                ],
                'typoTolerance' => true,
                'minWordSizefor1Typo' => 4,
                'minWordSizefor2Typos' => 8,
                'hitsPerPage' => 20,
                'maxValuesPerFacet' => 100,
            ],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Search Configuration
    |--------------------------------------------------------------------------
    |
    | Default search parameters and settings.
    |
    */

    'search' => [
        'default_hits_per_page' => 20,
        'max_hits_per_page' => 100,
        'facets' => [
            'categories',
            'authors',
            'publisher',
            'language',
            'published_year',
            'rating_range',
        ],
    ],
];
