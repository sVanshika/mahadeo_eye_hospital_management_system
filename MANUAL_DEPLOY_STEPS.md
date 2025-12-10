# Manual Deployment Steps (Avoid Charges)

Since you already have a database, deploy **only the backend** manually to avoid any charges.

---

## 🚀 Step 1: Create Web Service (NOT Blueprint)

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"** (NOT Blueprint!)
3. Connect GitHub repository:
   - Select: `mahadeo_eye_hospital_management_system`
   - Branch: `Eswar`

---

## ⚙️ Step 2: Configure Settings

Fill in these fields:

**Basic Settings:**
- **Name**: `eye-hospital-backend`
- **Region**: **Oregon** (same as your database)
- **Branch**: `Eswar`
- **Root Directory**: Leave empty
- **Runtime**: `Python 3`
- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`

---

## 🔐 Step 3: Add Environment Variables

Click **"Advanced"** → Scroll to **"Environment Variables"**

Add these **one by one**:

1. **PYTHON_VERSION**
   ```
   Key: PYTHON_VERSION
   Value: 3.12.4
   ```

2. **DATABASE_URL** ⭐
   ```
   Key: DATABASE_URL
   Value: postgresql://eye_hospital_db_user:xKTLPvjCPXVHiHonSWftvCGNnqPccPWd@dpg-d4snm1ali9vc73ek0jv0-a/eye_hospital_db
   ```

3. **SECRET_KEY**
   ```
   Key: SECRET_KEY
   Value: <Generate using: python -c "import secrets; print(secrets.token_urlsafe(32))">
   ```
   Or use a temporary value: `your-super-secret-key-change-in-production-12345`

4. **ALGORITHM**
   ```
   Key: ALGORITHM
   Value: HS256
   ```

5. **ACCESS_TOKEN_EXPIRE_MINUTES**
   ```
   Key: ACCESS_TOKEN_EXPIRE_MINUTES
   Value: 30
   ```

6. **CORS_ORIGINS**
   ```
   Key: CORS_ORIGINS
   Value: https://mahadeo-eye-hospital-management-sys.vercel.app,http://localhost:3000,http://localhost:3001
   ```
   (Update after frontend deployment)

---

## ✅ Step 4: Create Service

1. Review all settings
2. **Make sure no database service is being created**
3. Click **"Create Web Service"**
4. Wait for deployment (~5-10 minutes)

---

## 🗄️ Step 5: Initialize Database

After backend is deployed:

1. Go to Backend Service → **"Shell"** tab
2. Run:
   ```bash
   cd backend
   python init_db.py
   ```

---

## ✅ Step 6: Verify

1. Visit: `https://eye-hospital-backend.onrender.com/health`
2. Visit: `https://eye-hospital-backend.onrender.com/docs`

---

## 💡 Why Manual Instead of Blueprint?

- ✅ **No risk** of creating unwanted services
- ✅ **Full control** over configuration
- ✅ **No charges** for database (you already have one)
- ✅ **Direct** environment variable setup
- ✅ **Easier** to troubleshoot

---

**This approach ensures you only create the backend service and use your existing database!** 🎯

