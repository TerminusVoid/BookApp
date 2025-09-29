# Database Schema Diagram

## Entity Relationship Diagram

```
┌─────────────────────────────────────┐
│                USERS                │
├─────────────────────────────────────┤
│ id (PK)              BIGINT         │
│ name                 VARCHAR(255)   │
│ email                VARCHAR(255)   │
│ email_verified_at    TIMESTAMP      │
│ password             VARCHAR(255)   │
│ remember_token       VARCHAR(100)   │
│ created_at           TIMESTAMP      │
│ updated_at           TIMESTAMP      │
└─────────────────────────────────────┘
                    │
                    │ 1:N
                    │
                    ▼
┌─────────────────────────────────────┐
│              FAVORITES              │
├─────────────────────────────────────┤
│ id (PK)              BIGINT         │
│ user_id (FK)         BIGINT         │
│ book_id (FK)         BIGINT         │
│ created_at           TIMESTAMP      │
│ updated_at           TIMESTAMP      │
│                                     │
│ UNIQUE(user_id, book_id)            │
│ INDEX(user_id)                      │
└─────────────────────────────────────┘
                    │
                    │ N:1
                    │
                    ▼
┌─────────────────────────────────────┐
│                BOOKS                │
├─────────────────────────────────────┤
│ id (PK)              BIGINT         │
│ google_books_id      VARCHAR(255)   │
│ title                VARCHAR(255)   │
│ authors              JSON           │
│ description          TEXT           │
│ publisher            VARCHAR(255)   │
│ published_date       VARCHAR(255)   │
│ page_count           INTEGER        │
│ categories           JSON           │
│ language             VARCHAR(255)   │
│ isbn_10              VARCHAR(255)   │
│ isbn_13              VARCHAR(255)   │
│ thumbnail            VARCHAR(255)   │
│ small_thumbnail      VARCHAR(255)   │
│ average_rating       DECIMAL(3,2)   │
│ ratings_count        INTEGER        │
│ preview_link         VARCHAR(255)   │
│ info_link            VARCHAR(255)   │
│ created_at           TIMESTAMP      │
│ updated_at           TIMESTAMP      │
│                                     │
│ UNIQUE(google_books_id)             │
│ INDEX(google_books_id)              │
│ INDEX(title)                        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│        PERSONAL_ACCESS_TOKENS       │
├─────────────────────────────────────┤
│ id (PK)              BIGINT         │
│ tokenable_type       VARCHAR(255)   │
│ tokenable_id         BIGINT         │
│ name                 VARCHAR(255)   │
│ token                VARCHAR(64)    │
│ abilities            TEXT           │
│ last_used_at         TIMESTAMP      │
│ expires_at           TIMESTAMP      │
│ created_at           TIMESTAMP      │
│ updated_at           TIMESTAMP      │
│                                     │
│ UNIQUE(token)                       │
│ INDEX(tokenable_type, tokenable_id) │
└─────────────────────────────────────┘
```

## Table Relationships

### 1. Users → Favorites (One-to-Many)
- One user can have multiple favorite books
- Each favorite belongs to exactly one user
- Foreign key: `favorites.user_id` → `users.id`
- Cascade delete: When a user is deleted, all their favorites are deleted

### 2. Books → Favorites (One-to-Many)
- One book can be favorited by multiple users
- Each favorite references exactly one book
- Foreign key: `favorites.book_id` → `books.id`
- Cascade delete: When a book is deleted, all favorites referencing it are deleted

### 3. Users → Personal Access Tokens (One-to-Many)
- One user can have multiple API tokens (for different devices/sessions)
- Each token belongs to exactly one user
- Polymorphic relationship: `tokenable_type` = 'App\Models\User', `tokenable_id` = user.id

## Indexes and Constraints

### Primary Keys
- `users.id` - Auto-incrementing primary key
- `books.id` - Auto-incrementing primary key
- `favorites.id` - Auto-incrementing primary key
- `personal_access_tokens.id` - Auto-incrementing primary key

### Unique Constraints
- `users.email` - Ensures unique email addresses
- `books.google_books_id` - Prevents duplicate books from Google Books API
- `favorites(user_id, book_id)` - Prevents duplicate favorites
- `personal_access_tokens.token` - Ensures unique API tokens

### Foreign Key Constraints
- `favorites.user_id` REFERENCES `users.id` ON DELETE CASCADE
- `favorites.book_id` REFERENCES `books.id` ON DELETE CASCADE

### Indexes for Performance
- `books.google_books_id` - Fast lookup by Google Books ID
- `books.title` - Fast search by book title
- `favorites.user_id` - Fast lookup of user's favorites
- `personal_access_tokens(tokenable_type, tokenable_id)` - Fast token validation

## Data Types and Storage

### JSON Fields
- `books.authors` - Array of author names
- `books.categories` - Array of book categories/genres

### Text Fields
- `books.description` - Full book description (can be long)
- `personal_access_tokens.abilities` - Serialized token permissions

### Decimal Fields
- `books.average_rating` - Precise rating storage (e.g., 4.25)

### Timestamp Fields
- All tables include `created_at` and `updated_at` for audit trails
- `users.email_verified_at` - Email verification timestamp
- `personal_access_tokens.last_used_at` - Token usage tracking
- `personal_access_tokens.expires_at` - Token expiration

## Cache Tables (Laravel Framework)

```
┌─────────────────────────────────────┐
│                CACHE                │
├─────────────────────────────────────┤
│ key                  VARCHAR(255)   │
│ value                LONGTEXT       │
│ expiration           INTEGER        │
│                                     │
│ PRIMARY KEY(key)                    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│             CACHE_LOCKS             │
├─────────────────────────────────────┤
│ key                  VARCHAR(255)   │
│ owner                VARCHAR(255)   │
│ expiration           INTEGER        │
│                                     │
│ PRIMARY KEY(key)                    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│                JOBS                 │
├─────────────────────────────────────┤
│ id (PK)              BIGINT         │
│ queue                VARCHAR(255)   │
│ payload              LONGTEXT       │
│ attempts             TINYINT        │
│ reserved_at          INTEGER        │
│ available_at         INTEGER        │
│ created_at           INTEGER        │
│                                     │
│ INDEX(queue)                        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│             JOB_BATCHES             │
├─────────────────────────────────────┤
│ id                   VARCHAR(255)   │
│ name                 VARCHAR(255)   │
│ total_jobs           INTEGER        │
│ pending_jobs         INTEGER        │
│ failed_jobs          INTEGER        │
│ failed_job_ids       LONGTEXT       │
│ options              MEDIUMTEXT     │
│ cancelled_at         INTEGER        │
│ created_at           INTEGER        │
│ finished_at          INTEGER        │
│                                     │
│ PRIMARY KEY(id)                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│             FAILED_JOBS             │
├─────────────────────────────────────┤
│ id (PK)              BIGINT         │
│ uuid                 VARCHAR(255)   │
│ connection           TEXT           │
│ queue                TEXT           │
│ payload              LONGTEXT       │
│ exception            LONGTEXT       │
│ failed_at            TIMESTAMP      │
│                                     │
│ UNIQUE(uuid)                        │
└─────────────────────────────────────┘
```

## Migration Order

1. `create_users_table` - Base user authentication
2. `create_cache_table` - Caching infrastructure
3. `create_jobs_table` - Queue system
4. `create_books_table` - Book data storage
5. `create_favorites_table` - User favorites (depends on users and books)
6. `create_personal_access_tokens_table` - API authentication

This schema provides:
- **Scalability**: Efficient indexes for large datasets
- **Data Integrity**: Foreign key constraints and unique constraints
- **Performance**: Strategic indexing for common queries
- **Flexibility**: JSON fields for variable data structures
- **Security**: Proper token management and user authentication
- **Audit Trail**: Timestamps for all operations
