# Deploy Using Render Blueprint (Easiest Method)

Render Blueprint automatically configures everything using the `render.yaml` file. This is the easiest way to deploy!

---

## 🚀 Step 1: Update render.yaml Database Reference

**Important**: Since your database already exists, you need to either:

### Option A: Link to Existing Database (Recommended)

The `render.yaml` references a database named `eye-hospital-db`. If your database has a different name, you need to:

1. Check your database service name in Render Dashboard
2. Update `render.yaml` line 22 to match your actual database service name:
   ```yaml
   fromDatabase:
     name: eye-hospital-db  # Change this to match your actual database service name
   ```

**OR** manually set DATABASE_URL after deployment.

---

## 📋 Step 2: Deploy Using Blueprint

1. **Go to Render Dashboard**: https://dashboard.render.com/
2. **Click "New +"** → **"Blueprint"**
3. **Connect GitHub repository**:
   - If not connected, connect your GitHub account
   - Select repository: `mahadeo_eye_hospital_management_system`
   - Select branch: `Eswar`
   - Render will automatically detect `render.yaml`

4. **Review the Blueprint**:
   - Render will show you what services will be created
   - It will show: 1 Web Service (backend)
   - Database is NOT created (you already have it)

5. **Link Your Existing Database**:
   - In the Blueprint preview, find the backend service
   - Click on "Environment Variables"
   - Find `DATABASE_URL`
   - Either:
     - **Option 1**: If your database service name matches `eye-hospital-db`, it will auto-link
     - **Option 2**: Click "Edit" and manually set:
       ```
       postgresql://eye_hospital_db_user:xKTLPvjCPXVHiHonSWftvCGNnqPccPWd@dpg-d4snm1ali9vc73ek0jv0-a/eye_hospital_db
       ```

6. **Apply the Blueprint**:
   - Click **"Apply"** or **"Create"**
   - Render will start deploying your backend

7. **Wait for Deployment**:
   - Deployment takes ~5-10 minutes
   - Watch the logs to see progress

---

## ✅ Step 3: Verify Deployment

After deployment completes:

1. **Check Backend URL**: 
   - Your service will be at: `https://eye-hospital-backend.onrender.com`
   - Note this URL for frontend deployment

2. **Test Health Endpoint**:
   - Visit: `https://eye-hospital-backend.onrender.com/health`
   - Should return: `{"status": "healthy"}`

3. **Check API Docs**:
   - Visit: `https://eye-hospital-backend.onrender.com/docs`
   - Should see FastAPI Swagger documentation

---

## 🔧 Manual DATABASE_URL Setup (If Auto-Link Doesn't Work)

If the database doesn't auto-link:

1. Go to Render Dashboard → Your Backend Service
2. Go to **"Environment"** tab
3. Find `DATABASE_URL` variable
4. Click **"Edit"** or **"Add"**
5. Paste your database URL:
   ```
   postgresql://eye_hospital_db_user:xKTLPvjCPXVHiHonSWftvCGNnqPccPWd@dpg-d4snm1ali9vc73ek0jv0-a/eye_hospital_db
   ```
6. Click **"Save Changes"** (triggers redeploy)

---

## 🗄️ Step 4: Initialize Database

After backend is deployed and running:

1. Go to Render Dashboard → Your Backend Service
2. Click **"Shell"** tab
3. Run:
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

## 📝 Update Environment Variables (After Frontend Deployment)

After you deploy frontend on Vercel:

1. Go to Render Dashboard → Backend Service → **"Environment"**
2. Find `CORS_ORIGINS`
3. Update to include your Vercel frontend URL:
   ```
   https://your-frontend.vercel.app,http://localhost:3000,http://localhost:3001
   ```
4. Save (triggers redeploy)

---

## ✨ Why Blueprint is Easier

✅ **Automatic Configuration**: All settings from `render.yaml`  
✅ **One Click Deploy**: No manual configuration needed  
✅ **Version Controlled**: Changes tracked in Git  
✅ **Easy Updates**: Update `render.yaml` and redeploy  

---

## 🔄 Updating Deployment

After making changes:

1. Update `render.yaml` if needed
2. Commit and push to GitHub
3. Render will auto-detect changes (if auto-deploy enabled)
4. Or manually trigger redeploy from Render dashboard

---

**That's it! Much easier than manual setup! 🎉**

