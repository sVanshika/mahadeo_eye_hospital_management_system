# 🚀 How to Run Eye Hospital Management System

## 📋 Prerequisites

Before running the project, ensure you have:

- ✅ **Python 3.11+** installed
- ✅ **Node.js 18+** and npm installed
- ✅ **Git** (if cloning from repository)
- ✅ **Windows OS** (for `.bat` scripts) or adapt commands for Linux/Mac

---

## ⚡ Quick Start (Easiest Method)

### **Method 1: Using Startup Script (Recommended)**

1. **Double-click** the `start_system.bat` file
   - This will automatically start both backend and frontend servers
   - Two command windows will open (one for backend, one for frontend)

2. **Wait** for both servers to start (~10-20 seconds)

3. **Open browser** and navigate to:
   ```
   http://localhost:3000
   ```

4. **Login** with default credentials:
   - **Admin:** `admin` / `admin123`
   - **Registration:** `reg` / `reg123`
   - **Nursing:** `nurse` / `nurse123`

---

## 📖 Manual Setup (Step by Step)

### **Step 1: Install Backend Dependencies**

```bash
# Navigate to backend folder
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Or if you're using Python 3 specifically:
python -m pip install -r requirements.txt
```

**Backend Dependencies Include:**
- FastAPI
- Uvicorn
- SQLAlchemy
- Pydantic
- Python-Jose (JWT)
- Passlib
- Python-SocketIO
- And more...

---

### **Step 2: Install Frontend Dependencies**

```bash
# Navigate to frontend folder (from project root)
cd frontend

# Install Node.js dependencies
npm install
```

**Frontend Dependencies Include:**
- React
- Material-UI (MUI)
- React Router
- Socket.IO Client
- Axios
- And more...

---

### **Step 3: Start Backend Server**

```bash
# From backend folder
cd backend

# Start backend server
python main.py

# Alternative: Use uvicorn directly
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Backend will start on:**
- Server: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`
- WebSocket: `ws://localhost:8000`

**You should see:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

---

### **Step 4: Start Frontend Server**

**Open a NEW terminal/command prompt** (keep backend running)

```bash
# From frontend folder
cd frontend

# Start frontend development server
npm start
```

**Frontend will start on:**
- `http://localhost:3000`
- Browser will open automatically

**You should see:**
```
Compiled successfully!

You can now view frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

---

## 🔧 Troubleshooting

### **Problem 1: Port Already in Use**

**Error:** `Address already in use` or `Port 8000/3000 is already in use`

**Solution:**

**For Backend (Port 8000):**
```bash
# Windows
netstat -ano | findstr :8000
taskkill /F /PID <PID_NUMBER>

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

**For Frontend (Port 3000):**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /F /PID <PID_NUMBER>

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

---

### **Problem 2: Module Not Found Errors**

**Error:** `ModuleNotFoundError` or `Cannot find module`

**Solution:**

**Backend:**
```bash
cd backend
pip install -r requirements.txt --force-reinstall
```

**Frontend:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

### **Problem 3: Database Connection Errors**

**Error:** `Could not connect to database` or `SQLite errors`

**Solution:**
The project uses **SQLite** by default (no separate database installation needed). The database file will be created automatically at `backend/eye_hospital.db` on first run.

**If database is corrupted:**
```bash
cd backend
# Backup old database
mv eye_hospital.db eye_hospital.db.backup
# Restart backend (new database will be created)
python main.py
```

---

### **Problem 4: CORS Errors**

**Error:** `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solution:**
This shouldn't happen with the current setup, but if it does:

1. Check that backend is running on `http://localhost:8000`
2. Check that frontend is running on `http://localhost:3000`
3. Verify `backend/main.py` has CORS middleware configured

---

### **Problem 5: WebSocket Connection Failed**

**Error:** `WebSocket connection failed` in browser console

**Solution:**
1. Make sure backend server is running
2. Check browser console for WebSocket errors
3. The system will work without WebSocket (with manual refresh)

---

## 📱 Access Points

Once both servers are running:

| Service | URL | Description |
|---------|-----|-------------|
| **Main Application** | http://localhost:3000 | Login and use the system |
| **Backend API** | http://localhost:8000 | API endpoints |
| **API Documentation** | http://localhost:8000/docs | Interactive API docs |
| **Display Screen (All)** | http://localhost:3000/display | All OPDs display |
| **Display OPD 1** | http://localhost:3000/display/opd1 | OPD 1 display only |
| **Display OPD 2** | http://localhost:3000/display/opd2 | OPD 2 display only |
| **Display OPD 3** | http://localhost:3000/display/opd3 | OPD 3 display only |

---

## 👤 Default Login Credentials

### **Admin Account**
- **Username:** `admin`
- **Password:** `admin123`
- **Access:** Full system access, user management, reports

### **Registration Staff**
- **Username:** `reg`
- **Password:** `reg123`
- **Access:** Patient registration, token generation

### **Nursing Staff**
- **Username:** `nurse`
- **Password:** `nurse123`
- **Access:** OPD queue management

**For specific OPD access:**
- Login as Admin → Go to Admin Panel → Users → Manage OPD access for nurses

---

## 🎯 Quick Workflow Test

### **Test the Complete System:**

1. **Login as Registration (`reg` / `reg123`)**
   - Register a new patient
   - Allocate patient to OPD 1
   - Print token (if printer configured)

2. **Login as Nursing Staff (`nurse` / `nurse123`)**
   - Select OPD 1
   - See the patient in queue
   - Click "Call Next Patient"
   - Patient moves to "Currently in OPD"

3. **Open Display Screen (New Tab)**
   - Navigate to `http://localhost:3000/display/opd1`
   - See real-time queue updates
   - No login required (public display)

4. **Test Referral**
   - In OPD Management, refer patient to OPD 2
   - Switch to OPD 2
   - See referred patient in queue

5. **Test Dilation**
   - Click "Dilate Patient"
   - Patient status changes to "Dilated"
   - After some time, click "Return Dilated Patient"

---

## 🔄 Restarting the System

### **To Stop:**
- Close both command prompt windows (backend and frontend)
- Or press `Ctrl+C` in each terminal

### **To Restart:**
- Run `start_system.bat` again
- Or manually start backend and frontend as shown above

---

## 📊 Database Location

- **SQLite Database:** `backend/eye_hospital.db`
- **Automatic Creation:** Created on first run
- **Backup:** Copy `eye_hospital.db` file to backup
- **Reset:** Delete `eye_hospital.db` and restart backend

---

## 🌐 Network Access (LAN)

To access from other devices on your network:

### **Find Your IP Address:**

**Windows:**
```bash
ipconfig
# Look for "IPv4 Address" under your active network adapter
# Example: 192.168.1.100
```

**Linux/Mac:**
```bash
ifconfig
# or
ip addr show
```

### **Access from Other Devices:**

Replace `localhost` with your IP address:

- **Application:** `http://192.168.1.100:3000`
- **Display Screens:** `http://192.168.1.100:3000/display/opd1`

**Note:** Make sure your firewall allows connections on ports 3000 and 8000.

---

## 🐛 Debug Mode

### **Backend Debug Logs:**
Check the backend terminal for detailed logs:
- API requests
- Database queries
- WebSocket events
- Error stack traces

### **Frontend Debug:**
Open browser Developer Tools (F12):
- **Console Tab:** JavaScript errors, API responses
- **Network Tab:** API calls, WebSocket connections
- **Application Tab:** LocalStorage data

---

## 📦 Project Structure

```
mahadeo_eye_hospital_management_system/
├── backend/
│   ├── main.py              # Backend entry point
│   ├── database_sqlite.py   # Database models
│   ├── routers/             # API endpoints
│   │   ├── auth.py
│   │   ├── patients.py
│   │   ├── opd.py
│   │   ├── display.py
│   │   └── admin.py
│   ├── requirements.txt     # Python dependencies
│   └── eye_hospital.db      # SQLite database (auto-created)
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   └── App.js           # Main app component
│   ├── package.json         # Node.js dependencies
│   └── public/              # Static files
│
└── start_system.bat         # Startup script
```

---

## ✅ System Requirements

### **Minimum:**
- CPU: Dual-core processor
- RAM: 4GB
- Storage: 1GB free space
- OS: Windows 10+, Linux, macOS

### **Recommended:**
- CPU: Quad-core processor
- RAM: 8GB+
- Storage: 5GB+ free space
- Network: Stable LAN connection for display screens

---

## 🎉 You're All Set!

The system is now running. Here's what to do next:

1. ✅ **Login** as Admin (`admin` / `admin123`)
2. ✅ **Create Users** in Admin Panel
3. ✅ **Set OPD Access** for nurses
4. ✅ **Test Registration** flow
5. ✅ **Set up Display Screens** on LED monitors
6. ✅ **Start Using** the system!

---

## 📞 Need Help?

- **API Documentation:** http://localhost:8000/docs
- **Check Logs:** Look at backend terminal for errors
- **Browser Console:** Press F12 to see frontend errors
- **Database Reset:** Delete `backend/eye_hospital.db` and restart

---

## 🚀 Quick Commands Reference

```bash
# Start Everything (Windows)
start_system.bat

# Start Backend Only
cd backend && python main.py

# Start Frontend Only
cd frontend && npm start

# Install Dependencies
cd backend && pip install -r requirements.txt
cd frontend && npm install

# Stop All Processes
# Close terminal windows or press Ctrl+C
```

---

**Happy Managing! 🏥✨**

