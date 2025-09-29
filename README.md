# BookDiscover - Searchable Book Discovery Application

A modern, full-stack web application for discovering and managing books using the Google Books API. Built with Laravel 12 (PHP 8.4) backend and React with TypeScript frontend.

## 🚀 Live Demo

**Frontend:** [http://localhost:5173](http://localhost:5173)  
**Backend API:** [http://localhost:8000](http://localhost:8000)

## ✨ Features

### Core Functionality
- **🔍 Instant Book Search**: Search through millions of books using Google Books API
- **📚 Book Details**: Comprehensive book information including ratings, descriptions, and metadata
- **❤️ Favorites System**: Save and manage your favorite books (authenticated users only)
- **🔐 User Authentication**: Secure registration and login system
- **📱 Responsive Design**: Mobile-first design that works on all devices

### Technical Features
- **⚡ Rate-Limited API**: Respects Google Books API rate limits with intelligent caching
- **🗄️ Smart Caching**: Redis-based caching for improved performance
- **🔒 Secure Authentication**: Laravel Sanctum for API authentication
- **🎨 Modern UI**: TailwindCSS for beautiful, responsive design
- **📊 Pagination**: Efficient pagination for large result sets

## 🛠️ Tech Stack

### Backend
- **PHP 8.4** - Latest PHP version
- **Laravel 12** - Modern PHP framework
- **MySQL** - Relational database
- **Laravel Sanctum** - API authentication
- **Guzzle HTTP** - HTTP client for API requests
- **Redis/File Cache** - Caching layer

### Frontend
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **TailwindCSS** - Utility-first CSS framework
- **Axios** - HTTP client
- **React Router** - Client-side routing

### External APIs
- **Google Books API** - Book data and search
- **Algolia** - Enhanced search capabilities (optional)

## 📋 Prerequisites

- **PHP 8.4+** with extensions: `pdo`, `mbstring`, `tokenizer`, `xml`, `ctype`, `json`
- **Composer** - PHP dependency manager
- **Node.js 18+** - JavaScript runtime
- **npm** - Node package manager
- **MySQL 8.0+** - Database server
- **Redis** (optional) - For caching

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd BookApp
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install PHP dependencies
composer install

# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Configure database in .env file
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=bookapp
DB_USERNAME=your_username
DB_PASSWORD=your_password

# Run database migrations
php artisan migrate

# Start the development server
php artisan serve
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend

# Install Node dependencies
npm install

# Start the development server
npm run dev
```

### 4. Environment Configuration

Update your `.env` file in the backend directory:

```env
# Application
APP_NAME="BookDiscover"
APP_URL=http://localhost:8000

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=bookapp
DB_USERNAME=your_username
DB_PASSWORD=your_password

# Frontend URL for CORS
FRONTEND_URL=http://localhost:5173

# Google Books API
GOOGLE_BOOKS_API_URL=https://www.googleapis.com/books/v1

# Cache Configuration
CACHE_STORE=file

# Sanctum Configuration
SANCTUM_STATEFUL_DOMAINS=localhost,localhost:5173,127.0.0.1:5173
```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "password_confirmation": "password123"
}
```

#### Login User
```http
POST /api/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Logout User
```http
POST /api/logout
Authorization: Bearer {token}
```

#### Get Current User
```http
GET /api/user
Authorization: Bearer {token}
```

### Book Endpoints

#### Search Books
```http
GET /api/books/search?q=javascript&page=1&per_page=20
```

#### Get Book Details
```http
GET /api/books/{google_books_id}
```

#### List Books
```http
GET /api/books?page=1&per_page=20&sort=created_at&order=desc
```

### Favorites Endpoints (Authenticated)

#### Get User Favorites
```http
GET /api/favorites
Authorization: Bearer {token}
```

#### Add to Favorites
```http
POST /api/favorites
Authorization: Bearer {token}
Content-Type: application/json

{
  "book_id": 123
}
```

#### Toggle Favorite
```http
POST /api/favorites/toggle
Authorization: Bearer {token}
Content-Type: application/json

{
  "book_id": 123
}
```

#### Remove from Favorites
```http
DELETE /api/favorites/{book_id}
Authorization: Bearer {token}
```

### Response Format

All API responses follow this format:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data here
  },
  "errors": {
    // Validation errors (if any)
  }
}
```

## 🗄️ Database Schema

### Users Table
```sql
- id (bigint, primary key)
- name (varchar)
- email (varchar, unique)
- email_verified_at (timestamp, nullable)
- password (varchar)
- created_at (timestamp)
- updated_at (timestamp)
```

### Books Table
```sql
- id (bigint, primary key)
- google_books_id (varchar, unique)
- title (varchar)
- authors (json)
- description (text, nullable)
- publisher (varchar, nullable)
- published_date (varchar, nullable)
- page_count (integer, nullable)
- categories (json)
- language (varchar, nullable)
- isbn_10 (varchar, nullable)
- isbn_13 (varchar, nullable)
- thumbnail (varchar, nullable)
- small_thumbnail (varchar, nullable)
- average_rating (decimal, nullable)
- ratings_count (integer, nullable)
- preview_link (varchar, nullable)
- info_link (varchar, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

### Favorites Table
```sql
- id (bigint, primary key)
- user_id (bigint, foreign key)
- book_id (bigint, foreign key)
- created_at (timestamp)
- updated_at (timestamp)
- unique(user_id, book_id)
```

## 🏗️ Project Structure

```
BookApp/
├── backend/                 # Laravel backend
│   ├── app/
│   │   ├── Http/Controllers/
│   │   │   ├── AuthController.php
│   │   │   ├── BookController.php
│   │   │   └── FavoriteController.php
│   │   ├── Models/
│   │   │   ├── User.php
│   │   │   ├── Book.php
│   │   │   └── Favorite.php
│   │   └── Services/
│   │       └── GoogleBooksService.php
│   ├── database/migrations/
│   ├── routes/api.php
│   └── .env
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── BookCard.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Search.tsx
│   │   │   ├── BookDetail.tsx
│   │   │   ├── Favorites.tsx
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   └── App.tsx
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

## 🚀 Deployment

### Backend Deployment (Laravel)

1. **Server Requirements:**
   - PHP 8.4+
   - MySQL 8.0+
   - Composer
   - Web server (Apache/Nginx)

2. **Deployment Steps:**
   ```bash
   # Clone repository
   git clone <repository-url>
   cd BookApp/backend
   
   # Install dependencies
   composer install --optimize-autoloader --no-dev
   
   # Set up environment
   cp .env.example .env
   php artisan key:generate
   
   # Configure database and run migrations
   php artisan migrate --force
   
   # Optimize for production
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```

3. **Web Server Configuration:**
   - Point document root to `backend/public`
   - Enable URL rewriting
   - Set appropriate file permissions

### Frontend Deployment (React)

1. **Build for Production:**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Deploy Build Files:**
   - Upload `dist/` folder contents to web server
   - Configure web server for SPA routing
   - Set up HTTPS (recommended)

### Recommended Hosting Platforms

- **Backend:** DigitalOcean, AWS EC2, Heroku, Laravel Forge
- **Frontend:** Vercel, Netlify, AWS S3 + CloudFront
- **Database:** AWS RDS, DigitalOcean Managed Databases

## 🔧 Development

### Running Tests

```bash
# Backend tests
cd backend
php artisan test

# Frontend tests
cd frontend
npm run test
```

### Code Quality

```bash
# PHP Code Style
cd backend
./vendor/bin/pint

# TypeScript/React Linting
cd frontend
npm run lint
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Google Books API](https://developers.google.com/books) for book data
- [Laravel](https://laravel.com/) for the excellent PHP framework
- [React](https://reactjs.org/) for the frontend library
- [TailwindCSS](https://tailwindcss.com/) for the utility-first CSS framework

## 📞 Support

For support, email support@bookdiscover.com or create an issue in the repository.

---

**Happy Reading! 📚**
