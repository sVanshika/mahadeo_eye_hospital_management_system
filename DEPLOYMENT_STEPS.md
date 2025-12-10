# Deployment Steps - Quick Reference

## ✅ Step 1: PostgreSQL Database - COMPLETED

Your database is created! Details:
- **Database Name**: `eye_hospital_db`
- **User**: `eye_hospital_db_user`
- **Internal URL**: `postgresql://eye_hospital_db_user:xKTLPvjCPXVHiHonSWftvCGNnqPccPWd@dpg-d4snm1ali9vc73ek0jv0-a/eye_hospital_db`

**✅ You can now proceed to Step 2!**

---

## 🔧 Step 2: Deploy Backend on Render

### Option A: Using render.yaml (Recommended)

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Add deployment configuration"
   git push origin Eswar
   ```

2. **Go to Render Dashboard** → Click **"New +"** → **"Blueprint"** (if you want to use render.yaml)

   OR

3. **Go to Render Dashboard** → Click **"New +"** → **"Web Service"**:
   - Connect GitHub repository
   - Select repository: `mahadeo_eye_hospital_management_system`
   - Select branch: `Eswar`

4. **Configure the service:**
   - **Name**: `eye-hospital-backend`
   - **Region**: **Same region as your database** (check your PostgreSQL service region)
   - **Root Directory**: Leave empty
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`

5. **Add Environment Variables:**
   Click **"Advanced"** → **"Add Environment Variable"**:
   
   ```
   PYTHON_VERSION = 3.12.4
   ```
   
   ```
   DATABASE_URL = postgresql://eye_hospital_db_user:xKTLPvjCPXVHiHonSWftvCGNnqPccPWd@dpg-d4snm1ali9vc73ek0jv0-a/eye_hospital_db
   ```
   
   ```
   SECRET_KEY = <Generate using: python -c "import secrets; print(secrets.token_urlsafe(32))">
   ```
   
   ```
   ALGORITHM = HS256
   ```
   
   ```
   ACCESS_TOKEN_EXPIRE_MINUTES = 30
   ```
   
   ```
   CORS_ORIGINS = https://your-frontend.vercel.app,http://localhost:3000
   ```
   (Update CORS_ORIGINS after frontend deployment)

6. **Link Database (Optional but recommended):**
   - In Environment tab, click **"Add from"**
   - Select your PostgreSQL service (`eye-hospital-db` or whatever you named it)
   - This ensures DATABASE_URL is automatically managed

7. **Click "Create Web Service"**
8. **Wait for deployment** (~5-10 minutes)
9. **Note your backend URL**: `https://eye-hospital-backend.onrender.com` (or similar)

---

## 🎨 Step 3: Deploy Frontend on Vercel

1. **Update frontend files with your backend URL** (before deploying):

   **File: `frontend/src/apiClient.js`** (Line 10):
   ```javascript
   ? 'https://YOUR-ACTUAL-BACKEND-URL.onrender.com'
   ```

   **File: `frontend/src/contexts/SocketContext.js`** (Line 29):
   ```javascript
   ? 'https://YOUR-ACTUAL-BACKEND-URL.onrender.com'
   ```

   Replace `YOUR-ACTUAL-BACKEND-URL` with your actual Render backend URL from Step 2.

2. **Go to Vercel Dashboard** → **"Add New..."** → **"Project"**
3. **Import GitHub repository**:
   - Select: `mahadeo_eye_hospital_management_system`
   - Select branch: `Eswar`

4. **Configure:**
   - **Framework Preset**: `Create React App`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`

5. **Environment Variables:**
   Click **"Environment Variables"** and add:
   ```
   REACT_APP_API_URL = https://YOUR-ACTUAL-BACKEND-URL.onrender.com
   ```
   (Replace with your actual backend URL)

6. **Click "Deploy"**
7. **Wait for deployment** (~2-3 minutes)
8. **Note your frontend URL**: `https://your-project.vercel.app`

---

## 🔄 Step 4: Update CORS in Backend

1. Go to **Render Dashboard** → Your Backend Service
2. Go to **"Environment"** tab
3. Find `CORS_ORIGINS` variable
4. Update it to include your Vercel frontend URL:
   ```
   https://your-actual-frontend.vercel.app,http://localhost:3000,http://localhost:3001
   ```
5. Click **"Save Changes"** (this will trigger a redeploy)

---

## 🗄️ Step 5: Initialize Database

After backend is deployed, initialize the database:

### Option A: Using Render Shell (Recommended)

1. Go to **Render Dashboard** → Your Backend Service
2. Click **"Shell"** tab
3. Run:
   ```bash
   cd backend
   python init_db.py
   ```

### Option B: Run Locally

1. Update your local `backend/.env`:
   ```env
   DATABASE_URL=postgresql://eye_hospital_db_user:xKTLPvjCPXVHiHonSWftvCGNnqPccPWd@dpg-d4snm1ali9vc73ek0jv0-a/eye_hospital_db
   ```
2. Run locally:
   ```bash
   cd backend
   python init_db.py
   ```

This creates:
- All database tables
- Admin user: `admin` / `admin123`
- Registration user: `reg` / `reg123`
- Nursing user: `nurse` / `nurse123`
- Initial rooms

---

## ✅ Step 6: Verify Deployment

1. **Backend Health Check**:
   - Visit: `https://your-backend.onrender.com/health`
   - Should return: `{"status": "healthy"}`

2. **Backend API Docs**:
   - Visit: `https://your-backend.onrender.com/docs`
   - Should see FastAPI Swagger UI

3. **Frontend**:
   - Visit your Vercel URL
   - Try logging in with: `admin` / `admin123`

---

## 📝 Important URLs Template

Fill these as you deploy:

- ✅ **Database Internal URL**: `postgresql://eye_hospital_db_user:...@dpg-d4snm1ali9vc73ek0jv0-a/eye_hospital_db`
- ⬜ **Backend URL**: `https://__________________.onrender.com`
- ⬜ **Frontend URL**: `https://__________________.vercel.app`

---

## 🔐 Generate SECRET_KEY

Run this command to generate a secure SECRET_KEY:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Copy the output and use it as your `SECRET_KEY` environment variable.

---

## ⚠️ Important Notes

1. **Keep your database URL secure** - Don't share it publicly
2. **Use Internal Database URL** for backend (not External)
3. **Backend and Database must be in same region** for best performance
4. **Update CORS_ORIGINS** after frontend deployment
5. **Free tier limitations**: Backend spins down after 15 min inactivity

---

**Next Step**: Deploy your backend service on Render using the DATABASE_URL above! 🚀

