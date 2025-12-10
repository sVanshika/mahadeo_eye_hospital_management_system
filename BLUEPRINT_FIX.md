# Fix: Blueprint Trying to Create New Database

If Render Blueprint is trying to charge for a new database instance, here's how to fix it:

## ✅ Solution: Deploy Backend Only (No Database)

Since you already have a database, the Blueprint should **ONLY** create the backend service.

The current `render.yaml` only creates the backend service - it doesn't create a database. But if Render is still showing a database option:

### Option 1: Use Manual Web Service (Recommended)

Instead of Blueprint, use manual setup:

1. Go to Render Dashboard → **"New +"** → **"Web Service"** (NOT Blueprint)
2. Connect GitHub repository
3. Select branch: `Eswar`
4. Render will still read some settings from `render.yaml`, but you control what gets created

### Option 2: Edit Blueprint Before Applying

When you see the Blueprint preview:
- **Uncheck or remove** any database service
- **Keep only** the backend web service
- Then apply

### Option 3: Use Manual Configuration

Skip Blueprint entirely and configure manually:

1. **"New +"** → **"Web Service"**
2. Configure manually with these settings:

**Settings:**
- Name: `eye-hospital-backend`
- Region: Oregon (or your database region)
- Branch: `Eswar`
- Build: `pip install -r backend/requirements.txt`
- Start: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`

**Environment Variables:**
- `PYTHON_VERSION` = `3.12.4`
- `DATABASE_URL` = `postgresql://eye_hospital_db_user:xKTLPvjCPXVHiHonSWftvCGNnqPccPWd@dpg-d4snm1ali9vc73ek0jv0-a/eye_hospital_db`
- `SECRET_KEY` = (generate one)
- `ALGORITHM` = `HS256`
- `ACCESS_TOKEN_EXPIRE_MINUTES` = `30`
- `CORS_ORIGINS` = `https://mahadeo-eye-hospital-management-sys.vercel.app,http://localhost:3000`

3. Click "Create Web Service"

---

## ✅ Current render.yaml Status

The current `render.yaml` **only has the backend service** - no database section. So if you use Blueprint:

1. It should **only** show the backend service
2. **No database** will be created
3. You'll just need to set the `DATABASE_URL` manually after deployment

---

## 🎯 Recommended Approach

**Use "Web Service" (manual) instead of Blueprint:**

1. More control
2. No risk of creating unwanted services
3. Can directly set environment variables
4. Easier to troubleshoot

The `render.yaml` file is just for reference - you can configure manually and it will work perfectly!

