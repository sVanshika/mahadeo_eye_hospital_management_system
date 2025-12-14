# Eye Hospital Patient Management System

A real-time queue and patient flow management system for eye hospitals.

## 🚀 Quick Start

### Prerequisites

- Python 3.10 or higher
- PostgreSQL database
- Node.js 16+ and npm
- Git

### Step 1: Setup Database

1. **Create a PostgreSQL database** named `Eye-Hospital`
2. **Note your database connection details:**
   - Host: `localhost` (or your database host)
   - Port: `5432` (default PostgreSQL port)
   - Database name: `Eye-Hospital`
   - Username: `postgres` (or your database user)
   - Password: Your database password

### Step 2: Setup Backend

1. **Navigate to backend folder:**
   ```bash
   cd backend
   ```

2. **Create environment file:**
   ```bash
   cp env.example .env
   ```

3. **Edit `.env` file** and add your database connection:
   ```
   DATABASE_URL=postgresql://your_username:your_password@localhost:5432/Eye-Hospital
   ```
   
   **Example:**
   ```
   DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/Eye-Hospital
   ```
   
   **Note:** If your password contains special characters like `@`, the system will automatically encode them.

4. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Initialize database:**
   ```bash
   python init_db.py
   ```
   This creates the necessary tables and default users.

6. **Start the backend server:**
   ```bash
   python main.py
   ```
   
   Or using uvicorn:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

   The API will be available at: `http://localhost:8000`
   API documentation: `http://localhost:8000/docs`

### Step 3: Setup Frontend

1. **Navigate to frontend folder:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the frontend:**
   ```bash
   npm start
   ```

   The application will open at: `http://localhost:3000`

## 🔐 Default Login Credentials

After running `init_db.py`, you can login with:

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Registration | `reg` | `reg123` |
| Nurse | `nurse` | `nurse123` |

**⚠️ Important:** Change these passwords in production!

## 📋 Database Connection Format

The `DATABASE_URL` follows this format:
```
postgresql://username:password@host:port/database_name
```

**Parts explained:**
- `username`: Your PostgreSQL username
- `password`: Your PostgreSQL password (will be auto-encoded if needed)
- `host`: Database server address (usually `localhost` for local)
- `port`: PostgreSQL port (usually `5432`)
- `database_name`: Your database name (should be `Eye-Hospital`)

**For cloud databases (like Render):**
```
postgresql://user:password@host-url:5432/database_name
```

## 📁 Project Structure

```
mahadeo_eye_hospital_management_system/
├── backend/           # FastAPI backend
│   ├── routers/      # API route handlers
│   ├── database.py   # Database models and connection
│   ├── main.py       # Application entry point
│   └── init_db.py    # Database initialization script
├── frontend/         # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   └── contexts/    # React contexts
│   └── package.json
└── README.md         # This file
```

## 🌐 Deployment

### Backend (Render)
- Uses `render.yaml` for configuration
- Set `DATABASE_URL` environment variable in Render dashboard

### Frontend (Vercel)
- Uses `vercel.json` for configuration
- Set `REACT_APP_API_URL` environment variable

## 📝 Notes

- The system uses PostgreSQL (not SQLite)
- All passwords are hashed using bcrypt
- WebSocket support for real-time updates
- OPD access control for nurse users

## 🆘 Need Help?

Check the API documentation at `http://localhost:8000/docs` when the backend is running.

