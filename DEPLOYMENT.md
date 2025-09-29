# 🚀 BookApp Deployment Guide

## Overview
- **Frontend**: React + Vite → Vercel (Free)
- **Backend**: Laravel → Railway (Free tier available)
- **Database**: MySQL → Aiven (Your existing setup)

## 📋 Prerequisites
- GitHub account
- Vercel account
- Railway account
- Aiven MySQL database (already set up)

## 1. 🐙 Push to GitHub

```bash
# Initialize git repository
cd /Users/farrukhraja/Documents/BookApp
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: BookApp with React frontend and Laravel backend"

# Create GitHub repository (via GitHub web interface)
# Then add remote and push:
git remote add origin https://github.com/YOUR_USERNAME/bookapp.git
git branch -M main
git push -u origin main
```

## 2. 🎯 Deploy Frontend to Vercel

### Step 1: Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with GitHub
3. Click "New Project"
4. Import your `bookapp` repository

### Step 2: Configure Build Settings
```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "installCommand": "cd frontend && npm install"
}
```

### Step 3: Environment Variables
Add in Vercel dashboard:
```
VITE_API_BASE_URL=https://your-backend-url.railway.app/api
```

## 3. 🚂 Deploy Backend to Railway

### Step 1: Connect to Railway
1. Go to [railway.app](https://railway.app)
2. Sign up/Login with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your `bookapp` repository

### Step 2: Configure Environment Variables
Add these in Railway dashboard:
```
APP_NAME=BookApp
APP_ENV=production
APP_KEY=base64:YOUR_GENERATED_KEY
APP_DEBUG=false
APP_URL=https://your-project-name.railway.app

# Database (Your Aiven MySQL)
DB_CONNECTION=mysql
DB_HOST=your-aiven-host
DB_PORT=3306
DB_DATABASE=your-database-name
DB_USERNAME=your-username
DB_PASSWORD=your-password

# Cache & Session
CACHE_STORE=database
SESSION_DRIVER=database
QUEUE_CONNECTION=database

# Algolia
ALGOLIA_APP_ID=your-algolia-app-id
ALGOLIA_SECRET=your-algolia-secret-key
ALGOLIA_SEARCH_KEY=your-algolia-search-key
ALGOLIA_BOOKS_INDEX=books
```

### Step 3: Generate APP_KEY
```bash
# Run locally to generate key
cd backend
php artisan key:generate --show
# Copy the generated key to Railway
```

## 4. 🔧 Configure CORS for Production

Update `backend/config/cors.php`:
```php
'allowed_origins' => [
    'https://your-vercel-app.vercel.app',
    'http://localhost:3000', // for development
],
```

## 5. 🗄️ Database Setup

Your Aiven MySQL is already set up. Just run migrations:
```bash
# Railway will run this automatically, but you can also run manually:
php artisan migrate --force
```

## 6. 📚 Index Books in Algolia

After deployment, run this command to populate Algolia:
```bash
# Via Railway console or locally pointing to production DB:
php artisan books:index --configure
```

## 🎉 Final Steps

1. **Update Frontend Environment**:
   - In Vercel, set `VITE_API_BASE_URL` to your Railway backend URL
   - Redeploy frontend

2. **Test the Application**:
   - Visit your Vercel URL
   - Test book search functionality
   - Test user registration/login

3. **Custom Domains** (Optional):
   - Add custom domain in Vercel
   - Add custom domain in Railway
   - Update CORS settings accordingly

## 💰 Cost Breakdown

- **Vercel**: Free (100GB bandwidth, unlimited requests)
- **Railway**: Free tier (500 hours/month, then $5/month)
- **Aiven MySQL**: Your existing plan
- **Algolia**: Free tier (10K requests/month)

**Total Monthly Cost**: $0-5 depending on usage

## 🔍 Free Alternatives for Backend

If you want completely free backend hosting:

### Option 1: Render (Free Tier)
- 750 hours/month free
- Sleeps after 15 minutes of inactivity
- Deploy: Connect GitHub → Select repo → Deploy

### Option 2: Heroku Alternative - Fly.io
- Free tier available
- Better performance than Render
- Deploy with `flyctl`

### Option 3: PlanetScale + Vercel Functions
- Convert Laravel routes to Vercel serverless functions
- Use PlanetScale for MySQL (free tier)
- Completely serverless and free

## 🚨 Important Notes

1. **Environment Files**: Never commit `.env` files
2. **API Keys**: Store all sensitive keys in platform environment variables
3. **CORS**: Update allowed origins for production
4. **Database**: Your Aiven MySQL connection should work from Railway
5. **Caching**: Database cache will work fine for free tiers

## 🛠️ Troubleshooting

### Common Issues:
1. **CORS Errors**: Update `cors.php` with your Vercel domain
2. **Database Connection**: Verify Aiven credentials in Railway
3. **Build Failures**: Check build logs in Railway/Vercel
4. **API Not Found**: Ensure `VITE_API_BASE_URL` is set correctly

### Debug Commands:
```bash
# Check Railway logs
railway logs

# Test database connection
php artisan tinker
DB::connection()->getPdo();

# Clear caches
php artisan config:clear
php artisan cache:clear
```

Your BookApp will be live with:
- ⚡ Lightning-fast frontend on Vercel
- 🚂 Scalable backend on Railway
- 🔍 Instant search with Algolia
- 💾 Reliable database on Aiven
