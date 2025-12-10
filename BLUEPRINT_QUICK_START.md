# Quick Start: Deploy Using Render Blueprint 🚀

This is the **easiest way** to deploy your backend!

---

## ✅ Step 1: Deploy Backend Using Blueprint

1. **Go to Render Dashboard**: https://dashboard.render.com/

2. **Click "New +"** → **"Blueprint"**

3. **Connect Repository**:
   - Select GitHub
   - Repository: `mahadeo_eye_hospital_management_system`
   - Branch: `Eswar`
   - Render will automatically detect `render.yaml`

4. **Review Blueprint**:
   - You'll see: 1 Web Service will be created
   - Database section is NOT needed (you already have it)

5. **Click "Apply" or "Create"**
   - Render will start deploying

6. **Wait ~5-10 minutes** for deployment

---

## 🔗 Step 2: Link Your Existing Database

After the backend service is created:

### Option A: Link Database in Blueprint (Before Applying)

If you see environment variables in the Blueprint preview:
- Find `DATABASE_URL`
- Click "Link Database" or select your existing PostgreSQL service
- This will auto-link

### Option B: Link After Deployment (Easiest)

1. Go to Render Dashboard → Your Backend Service (`eye-hospital-backend`)
2. Go to **"Environment"** tab
3. Find `DATABASE_URL` variable
4. Click **"Add from"** dropdown → Select your existing PostgreSQL service
5. OR manually set the value:
   ```
   postgresql://eye_hospital_db_user:xKTLPvjCPXVHiHonSWftvCGNnqPccPWd@dpg-d4snm1ali9vc73ek0jv0-a/eye_hospital_db
   ```
6. Click **"Save Changes"**

---

## ✅ Step 3: Initialize Database

After backend is running:

1. Go to Backend Service → **"Shell"** tab
2. Run:
   ```bash
   cd backend
   python init_db.py
   ```

---

## ✅ Step 4: Verify

1. Check backend URL: `https://eye-hospital-backend.onrender.com/health`
2. Check API docs: `https://eye-hospital-backend.onrender.com/docs`

---

## 🎯 That's It!

**Much simpler than manual setup!** Blueprint handles all the configuration automatically. 🎉

---

**Next**: Deploy frontend on Vercel using the same process.

