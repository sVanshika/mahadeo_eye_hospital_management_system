# Deployment Guide: Render (Backend + Database) + Vercel (Frontend)

This guide will help you deploy the Eye Hospital Management System to production.

## Architecture Overview

- **Backend**: Render (Python FastAPI)
- **Database**: Render PostgreSQL
- **Frontend**: Vercel (React)

---

## Part 1: Deploy PostgreSQL Database on Render

### Step 1: Create PostgreSQL Database

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `eye-hospital-db`
   - **Database**: `eye_hospital` (or leave default)
   - **User**: `eye_hospital_user` (or leave default)
   - **Region**: Choose closest to you (e.g., Singapore, Mumbai)
   - **PostgreSQL Version**: Latest (recommended)
   - **Plan**: Starter (Free) or paid

4. Click **"Create Database"**
5. Wait for database to be created (~2 minutes)

### Step 2: Get Database Connection String

1. Once created, go to your PostgreSQL service page
2. Find **"Connections"** section
3. Copy the **"Internal Database URL"** (format: `postgres://user:pass@host:port/dbname`)
4. **Important**: Note down this URL - you'll need it for backend deployment

---

## Part 2: Deploy Backend on Render

### Step 1: Connect GitHub Repository

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account if not already connected
4. Select your repository: `mahadeo_eye_hospital_management_system`
5. Select branch: `Eswar` (or your preferred branch)

### Step 2: Configure Web Service

**Basic Settings:**
- **Name**: `eye-hospital-backend`
- **Region**: Same as database (recommended)
- **Branch**: `Eswar`
- **Root Directory**: Leave empty (root of repo)
- **Runtime**: `Python 3`
- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`

**Environment Variables:**
Click **"Advanced"** → **"Add Environment Variable"** and add:

```
PYTHON_VERSION=3.12.4
DATABASE_URL=<Internal Database URL from PostgreSQL service>
SECRET_KEY=<Generate a secure random string>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
HOST=0.0.0.0
CORS_ORIGINS=https://your-frontend-url.vercel.app,http://localhost:3000,http://localhost:3001
```

**Important Notes:**
- `DATABASE_URL`: Use the **Internal Database URL** from your PostgreSQL service
- `SECRET_KEY`: Generate a secure random string (e.g., use Python: `python -c "import secrets; print(secrets.token_urlsafe(32))"`)
- `CORS_ORIGINS`: Add your Vercel frontend URL (update after frontend deployment)

### Step 3: Link Database to Backend

1. In your Web Service settings, go to **"Environment"** tab
2. Under **"Add from"**, select your PostgreSQL service (`eye-hospital-db`)
3. This automatically adds `DATABASE_URL` environment variable

### Step 4: Deploy

1. Click **"Create Web Service"**
2. Wait for deployment (~5-10 minutes)
3. Once deployed, note the URL: `https://eye-hospital-backend.onrender.com` (your service name may vary)

---

## Part 3: Deploy Frontend on Vercel

### Step 1: Prepare Frontend

1. Update `frontend/src/apiClient.js` - Backend URL is already configured
2. Update `frontend/src/contexts/SocketContext.js` - Socket.IO URL is already configured
3. Update `frontend/vercel.json` - Update backend URL if needed

**Important**: Before deploying, update these files with your actual Render backend URL:
- `frontend/src/apiClient.js`: Line 10 - Update backend URL
- `frontend/src/contexts/SocketContext.js`: Line 29 - Update backend URL

### Step 2: Connect to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository: `mahadeo_eye_hospital_management_system`
4. Select branch: `Eswar`

### Step 3: Configure Project

**Framework Preset:** Create React App

**Root Directory:** `frontend`

**Build Settings:**
- **Build Command**: `npm run build`
- **Output Directory**: `build`
- **Install Command**: `npm install`

**Environment Variables:**
Click **"Environment Variables"** and add:
```
REACT_APP_API_URL=https://eye-hospital-backend.onrender.com
```
(Update with your actual Render backend URL)

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for deployment (~2-3 minutes)
3. Once deployed, note the URL: `https://your-project-name.vercel.app`

---

## Part 4: Update CORS and Environment Variables

### Step 1: Update Backend CORS

1. Go back to Render Dashboard → Your Backend Service
2. Go to **"Environment"** tab
3. Update `CORS_ORIGINS` variable:
   ```
   CORS_ORIGINS=https://your-project-name.vercel.app,http://localhost:3000,http://localhost:3001
   ```
   (Replace with your actual Vercel URL)

4. Click **"Save Changes"** - This will trigger a redeploy

### Step 2: Update Frontend Backend URL (if needed)

If your Render backend URL differs, update:
1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. Update `REACT_APP_API_URL` with your actual backend URL

Or update in code:
- `frontend/src/apiClient.js`
- `frontend/src/contexts/SocketContext.js`

Then redeploy frontend.

---

## Part 5: Initialize Database

After backend is deployed, initialize the database:

### Option 1: Using Render Shell

1. Go to Render Dashboard → Your Backend Service
2. Click **"Shell"** tab
3. Run:
   ```bash
   cd backend
   python init_db.py
   ```

### Option 2: Using Local Script

1. Update your local `.env` with Render database URL:
   ```env
   DATABASE_URL=<Internal Database URL from Render>
   ```
2. Run locally:
   ```bash
   cd backend
   python init_db.py
   ```

This will create:
- Database tables
- Initial admin user (admin/admin123)
- Initial registration user (reg/reg123)
- Initial nursing user (nurse/nurse123)
- Initial rooms

---

## Part 6: Verify Deployment

### Check Backend

1. Visit: `https://eye-hospital-backend.onrender.com/docs`
2. Should see FastAPI Swagger documentation
3. Test health endpoint: `https://eye-hospital-backend.onrender.com/health`

### Check Frontend

1. Visit your Vercel URL
2. Try logging in with:
   - Username: `admin`
   - Password: `admin123`

### Check Database

1. Use Render PostgreSQL → **"Connect"** → **"psql"** to connect
2. Or use pgAdmin with External Database URL from Render

---

## Important URLs to Note

After deployment, you'll have:

- **Backend API**: `https://eye-hospital-backend.onrender.com`
- **API Docs**: `https://eye-hospital-backend.onrender.com/docs`
- **Frontend**: `https://your-project-name.vercel.app`
- **Database**: Internal connection (from Render dashboard)

---

## Troubleshooting

### Backend Issues

**Problem**: Backend fails to start
- **Solution**: Check Render logs, verify all environment variables are set
- **Solution**: Ensure `DATABASE_URL` is the Internal URL (not External)

**Problem**: Database connection failed
- **Solution**: Verify `DATABASE_URL` is correct
- **Solution**: Check if database service is running
- **Solution**: Ensure backend and database are in same region

**Problem**: CORS errors
- **Solution**: Update `CORS_ORIGINS` with your Vercel frontend URL
- **Solution**: Ensure URL has no trailing slash

### Frontend Issues

**Problem**: API calls fail
- **Solution**: Check `REACT_APP_API_URL` environment variable
- **Solution**: Verify backend URL in `apiClient.js`
- **Solution**: Check browser console for CORS errors

**Problem**: WebSocket not connecting
- **Solution**: Update Socket.IO URL in `SocketContext.js`
- **Solution**: Check if backend URL is accessible
- **Solution**: Render free tier may have WebSocket limitations (upgrade if needed)

### Database Issues

**Problem**: Tables don't exist
- **Solution**: Run `python backend/init_db.py` (see Part 5)

**Problem**: Can't connect to database
- **Solution**: Use Internal Database URL for backend (not External)
- **Solution**: Ensure backend and database services are linked in Render

---

## Render Free Tier Limitations

- **Backend**: Spins down after 15 minutes of inactivity (takes ~30 seconds to wake up)
- **Database**: 90 days free trial, then paid plans
- **WebSocket**: May have limitations on free tier

**Upgrade options**: Consider Render paid plans for production use.

---

## Environment Variables Summary

### Backend (Render)

```env
PYTHON_VERSION=3.12.4
DATABASE_URL=<From PostgreSQL service>
SECRET_KEY=<Generate secure random string>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
HOST=0.0.0.0
CORS_ORIGINS=<Your Vercel URL>,http://localhost:3000
```

### Frontend (Vercel)

```env
REACT_APP_API_URL=https://eye-hospital-backend.onrender.com
```

---

## Next Steps After Deployment

1. ✅ Test all features (login, patient registration, OPD management)
2. ✅ Update default passwords for admin/registration/nursing users
3. ✅ Set up custom domain (optional)
4. ✅ Configure SSL certificates (automatic on Render/Vercel)
5. ✅ Set up monitoring and alerts
6. ✅ Regular database backups (Render provides automatic backups on paid plans)

---

## Quick Deploy Checklist

- [ ] Create PostgreSQL database on Render
- [ ] Note Internal Database URL
- [ ] Deploy backend on Render
- [ ] Link database to backend service
- [ ] Set all environment variables
- [ ] Deploy frontend on Vercel
- [ ] Update CORS_ORIGINS with Vercel URL
- [ ] Initialize database (run init_db.py)
- [ ] Test login and basic functionality
- [ ] Update default user passwords

---

**Good luck with your deployment! 🚀**

