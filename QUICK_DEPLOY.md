# Quick Deployment Checklist

## ✅ Pre-Deployment Checklist

- [x] Database migrated from SQLite to PostgreSQL
- [x] All code updated to use PostgreSQL
- [x] `render.yaml` created for Render deployment
- [x] `vercel.json` created for Vercel deployment
- [x] Frontend API client configured
- [x] Socket.IO configured for production
- [x] CORS middleware configured

---

## 🚀 Deployment Steps

### 1. Deploy Database (Render) - ~2 minutes

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"PostgreSQL"**
3. Settings:
   - Name: `eye-hospital-db`
   - Database: `eye_hospital`
   - Plan: Starter (Free)
   - Region: Your choice
4. Click **"Create Database"**
5. **Copy Internal Database URL** (you'll need this!)

---

### 2. Deploy Backend (Render) - ~10 minutes

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub repository
4. Select repository and branch (`Eswar`)

**Settings:**
- Name: `eye-hospital-backend`
- Region: Same as database
- Branch: `Eswar`
- Root Directory: Leave empty
- Runtime: `Python 3`
- Build Command: `pip install -r backend/requirements.txt`
- Start Command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`

**Environment Variables:**
- `PYTHON_VERSION` = `3.12.4`
- `DATABASE_URL` = `<Internal Database URL from step 1>`
- `SECRET_KEY` = `<Generate: python -c "import secrets; print(secrets.token_urlsafe(32))">`
- `ALGORITHM` = `HS256`
- `ACCESS_TOKEN_EXPIRE_MINUTES` = `30`
- `CORS_ORIGINS` = `https://your-frontend.vercel.app,http://localhost:3000` (update after frontend deploy)

**OR use render.yaml:**
- Click "Apply render.yaml" if you uploaded it
- Render will read configuration from `render.yaml`

5. Click **"Create Web Service"**
6. Wait for deployment
7. **Note your backend URL**: `https://eye-hospital-backend.onrender.com`

---

### 3. Deploy Frontend (Vercel) - ~3 minutes

**Before deploying, update these files with your actual Render backend URL:**

1. `frontend/src/apiClient.js` - Line 10
2. `frontend/src/contexts/SocketContext.js` - Line 29

**Then deploy:**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import GitHub repository
4. Select branch: `Eswar`

**Settings:**
- Framework Preset: `Create React App`
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `build`
- Install Command: `npm install`

**Environment Variables:**
- `REACT_APP_API_URL` = `https://eye-hospital-backend.onrender.com` (your backend URL)

5. Click **"Deploy"**
6. **Note your frontend URL**: `https://your-project.vercel.app`

---

### 4. Update CORS in Backend

1. Go back to Render → Your Backend Service
2. Go to **"Environment"** tab
3. Update `CORS_ORIGINS`:
   ```
   https://your-project.vercel.app,http://localhost:3000,http://localhost:3001
   ```
4. Save (triggers redeploy)

---

### 5. Initialize Database

**Option A: Using Render Shell**
1. Render Dashboard → Backend Service → **"Shell"**
2. Run:
   ```bash
   cd backend
   python init_db.py
   ```

**Option B: Local Script**
1. Update local `.env` with Render database URL
2. Run locally:
   ```bash
   cd backend
   python init_db.py
   ```

---

## ✅ Verification

1. **Backend Health**: `https://eye-hospital-backend.onrender.com/health`
2. **API Docs**: `https://eye-hospital-backend.onrender.com/docs`
3. **Frontend**: Visit your Vercel URL
4. **Login**: Use `admin` / `admin123`

---

## 📝 Important URLs Template

Fill these after deployment:

- **Backend**: `https://__________________.onrender.com`
- **Frontend**: `https://__________________.vercel.app`
- **Database**: Internal URL from Render (no public URL)

---

## 🔧 Troubleshooting

**Backend won't start?**
- Check Render logs
- Verify all environment variables are set
- Ensure `DATABASE_URL` is Internal URL (not External)

**CORS errors?**
- Update `CORS_ORIGINS` with exact Vercel URL (no trailing slash)
- Redeploy backend after updating

**Database connection failed?**
- Verify `DATABASE_URL` is correct
- Ensure backend and database are in same region
- Check database service is running

**Frontend can't connect?**
- Update `REACT_APP_API_URL` in Vercel environment variables
- Check `apiClient.js` and `SocketContext.js` URLs
- Verify backend URL is correct

---

**Ready to deploy! Follow the steps above. 🚀**

