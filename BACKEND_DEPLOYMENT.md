# Backend Deployment on Render - Step by Step

## ✅ Database Created Successfully!

Your PostgreSQL database is ready:
- **Database**: `eye_hospital_db`
- **Internal URL**: `postgresql://eye_hospital_db_user:xKTLPvjCPXVHiHonSWftvCGNnqPccPWd@dpg-d4snm1ali9vc73ek0jv0-a/eye_hospital_db`

---

## 🚀 Deploy Backend Service

### Step 1: Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account (if not already)
4. Select repository: `mahadeo_eye_hospital_management_system`
5. Select branch: `Eswar`

### Step 2: Configure Service Settings

Fill in these settings:

**Basic Settings:**
- **Name**: `eye-hospital-backend`
- **Region**: **SAME REGION as your database** (check your PostgreSQL service - it shows the region)
- **Branch**: `Eswar`
- **Root Directory**: Leave empty (blank)
- **Runtime**: `Python 3`
- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`

### Step 3: Add Environment Variables

Click **"Advanced"** → Scroll to **"Environment Variables"** section.

Add these variables one by one:

1. **PYTHON_VERSION**
   - Key: `PYTHON_VERSION`
   - Value: `3.12.4`

2. **DATABASE_URL** ⭐ (Most Important!)
   - Key: `DATABASE_URL`
   - Value: `postgresql://eye_hospital_db_user:xKTLPvjCPXVHiHonSWftvCGNnqPccPWd@dpg-d4snm1ali9vc73ek0jv0-a/eye_hospital_db`
   - **Copy this exact URL from your database service**

3. **SECRET_KEY**
   - Key: `SECRET_KEY`
   - Value: Generate using:
     ```bash
     python -c "import secrets; print(secrets.token_urlsafe(32))"
     ```
   - Or use: `your-super-secret-key-change-this-in-production-123456`

4. **ALGORITHM**
   - Key: `ALGORITHM`
   - Value: `HS256`

5. **ACCESS_TOKEN_EXPIRE_MINUTES**
   - Key: `ACCESS_TOKEN_EXPIRE_MINUTES`
   - Value: `30`

6. **CORS_ORIGINS** (Update after frontend deployment)
   - Key: `CORS_ORIGINS`
   - Value: `https://your-frontend.vercel.app,http://localhost:3000,http://localhost:3001`
   - **Update this after you deploy frontend!**

### Step 4: Link Database (Optional but Recommended)

1. In the **"Environment"** section, find **"Add from"** dropdown
2. Select your PostgreSQL service (the one you just created)
3. This ensures Render manages the DATABASE_URL automatically
4. **Note**: If you link, it will override the manual DATABASE_URL above

### Step 5: Create and Deploy

1. Click **"Create Web Service"** (at bottom of page)
2. Render will start deploying
3. Wait for deployment (~5-10 minutes)
4. Watch the logs to see if deployment succeeds

### Step 6: Note Your Backend URL

After deployment completes, you'll see:
- **Your Service URL**: `https://eye-hospital-backend.onrender.com` (or similar)

**Save this URL** - you'll need it for frontend deployment!

---

## ✅ Verify Backend Deployment

1. **Health Check**:
   - Visit: `https://your-backend.onrender.com/health`
   - Should return: `{"status": "healthy"}`

2. **API Documentation**:
   - Visit: `https://your-backend.onrender.com/docs`
   - Should see FastAPI Swagger UI

---

## 🗄️ Initialize Database

After backend is deployed, initialize the database tables:

### Option A: Using Render Shell

1. Go to Render Dashboard → Your Backend Service
2. Click **"Shell"** tab (at the top)
3. In the shell, run:
   ```bash
   cd backend
   python init_db.py
   ```
4. You should see messages about creating tables and users

### Option B: Run Locally

1. Create/update `backend/.env` file:
   ```env
   DATABASE_URL=postgresql://eye_hospital_db_user:xKTLPvjCPXVHiHonSWftvCGNnqPccPWd@dpg-d4snm1ali9vc73ek0jv0-a/eye_hospital_db
   SECRET_KEY=your-secret-key
   ```
2. Run locally:
   ```bash
   cd backend
   python init_db.py
   ```

---

## 🔍 Troubleshooting

**Backend fails to start?**
- Check Render logs (Logs tab in your service)
- Verify DATABASE_URL is correct (use Internal URL, not External)
- Ensure all environment variables are set

**Database connection error?**
- Verify DATABASE_URL matches exactly
- Check if database service is running
- Ensure backend and database are in same region

**Build fails?**
- Check if `backend/requirements.txt` exists
- Verify Python version is correct
- Check build logs for specific errors

---

## 📋 Environment Variables Checklist

Make sure you have all these set:

- [x] `PYTHON_VERSION` = `3.12.4`
- [x] `DATABASE_URL` = `postgresql://eye_hospital_db_user:...@dpg-d4snm1ali9vc73ek0jv0-a/eye_hospital_db`
- [x] `SECRET_KEY` = `<generated or custom>`
- [x] `ALGORITHM` = `HS256`
- [x] `ACCESS_TOKEN_EXPIRE_MINUTES` = `30`
- [ ] `CORS_ORIGINS` = `<update after frontend deployment>`

---

**Next**: Once backend is deployed, proceed to frontend deployment on Vercel! 🚀

