# Eye Hospital Patient Management System

A comprehensive real-time queue and patient flow management system designed specifically for eye hospital OPD operations.

## Features

### Core Functionality
- **Patient Registration**: Digital token generation and patient registration
- **OPD Management**: Real-time queue management for multiple OPDs
- **Patient Flow Tracking**: Complete patient journey from registration to discharge
- **Real-time Updates**: WebSocket-based instant queue updates (< 1 second)
- **Display Screens**: Kiosk-mode displays for patient queues
- **Dilation Management**: Special handling for patients requiring eye drops
- **Referral System**: Inter-OPD patient referrals
- **Printing Integration**: ESC/POS thermal printer support for tokens and slips

### User Roles
- **Admin**: System management, user management, analytics, reports
- **Registration Staff**: Patient registration, token generation, OPD allocation
- **Nursing Staff**: Queue management, patient status updates, dilation handling

### Technical Features
- **Real-time Communication**: WebSocket connections for instant updates
- **Role-based Access Control**: Secure authentication and authorization
- **Responsive Design**: Material UI components for all screen sizes
- **Docker Support**: Containerized deployment with Docker Compose
- **Database**: PostgreSQL for reliable data persistence
- **API**: RESTful API with FastAPI backend

## Tech Stack

- **Frontend**: React.js + Material UI
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL
- **Real-time**: WebSockets (Socket.IO)
- **Deployment**: Docker + Nginx
- **Printing**: ESC/POS library

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for development)
- Python 3.11+ (for development)
- PostgreSQL (for development)

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd eye-hospital-system
   ```

2. **Start the system**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Manual Setup (Development)

1. **Setup Backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   cp env.example .env
   # Edit .env with your database settings
   python main.py
   ```

2. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   npm start
   ```

3. **Setup Database**
   ```bash
   # Create PostgreSQL database
   createdb eye_hospital
   # Run migrations (if any)
   ```

## Default Credentials

- **Admin**: `admin` / `admin123`
- **Registration Staff**: `reg` / `reg123`
- **Nursing Staff**: `nurse` / `nurse123`

## System Architecture

### Patient Flow
1. **Registration** → Patient receives token and OPD slip
2. **Vision Room** → Basic vision screening (Room 10)
3. **OPD Allocation** → Patient examined by doctor (OPD 1/2/3)
4. **Dilation Cases** → Eye drops, 30-40 minute wait, return to same OPD
5. **Refraction** → Dry/Wet refraction (Rooms 6 & 7)
6. **Retina Lab** → Advanced retinal tests (Room 5)
7. **Biometry** → Cataract and pre-surgical measurements
8. **Prescription & Discharge** → Patient completes visit

### Patient Statuses
- **Pending**: Waiting in queue
- **In**: Currently inside OPD
- **Dilated**: On hold for dilation (30-40 minutes)
- **Referred**: Referred to another OPD
- **End Visit**: Treatment completed

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Patients
- `POST /api/patients/register` - Register new patient
- `GET /api/patients` - List patients
- `POST /api/patients/{id}/allocate-opd` - Allocate OPD
- `PUT /api/patients/{id}/status` - Update patient status
- `POST /api/patients/{id}/refer` - Refer patient

### OPD Management
- `GET /api/opd/{opd_type}/queue` - Get OPD queue
- `POST /api/opd/{opd_type}/call-next` - Call next patient
- `POST /api/opd/{opd_type}/dilate-patient/{id}` - Mark for dilation
- `GET /api/opd/{opd_type}/stats` - Get OPD statistics

### Display
- `GET /api/display/{opd_type}` - Get OPD display data
- `GET /api/display/all` - Get all OPDs display data

### Admin
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/users` - User management
- `GET /api/admin/rooms` - Room management
- `GET /api/admin/patient-flows` - Patient flow history

### Printing
- `POST /api/printing/print-token/{id}` - Print patient token
- `POST /api/printing/print-opd-slip/{id}` - Print OPD slip
- `POST /api/printing/test-printer` - Test printer connection

## Configuration

### Environment Variables

#### Backend (.env)
```env
DATABASE_URL=postgresql://postgres:password@localhost/eye_hospital
SECRET_KEY=your-secret-key-change-in-production
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
PRINTER_IP=192.168.1.100
PRINTER_PORT=9100
```

#### Frontend
```env
REACT_APP_API_URL=http://localhost:8000
```

## Deployment

### Production Deployment

1. **Update environment variables** for production
2. **Configure SSL certificates** in nginx/ssl/
3. **Update nginx configuration** for HTTPS
4. **Set up database backups**
5. **Configure printer settings**

### Docker Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Printer Setup

The system supports ESC/POS thermal printers:

1. **Network Printer**: Set `PRINTER_IP` and `PRINTER_PORT`
2. **USB Printer**: Automatically detected
3. **Test Connection**: Use `/api/printing/test-printer`

## Monitoring and Maintenance

### Health Checks
- Backend: `GET /health`
- Database: Connection monitoring
- WebSocket: Real-time connection status

### Logs
- Backend logs: Docker logs
- Nginx logs: Access and error logs
- Database logs: PostgreSQL logs

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL is running
   - Verify DATABASE_URL in .env
   - Check network connectivity

2. **WebSocket Connection Failed**
   - Check CORS settings
   - Verify Socket.IO configuration
   - Check firewall settings

3. **Printer Not Working**
   - Verify printer IP and port
   - Check network connectivity
   - Test with `/api/printing/test-printer`

4. **Frontend Not Loading**
   - Check if backend is running
   - Verify API_URL configuration
   - Check browser console for errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## Changelog

### Version 1.0.0
- Initial release
- Complete patient management system
- Real-time queue updates
- Multi-role user system
- Printing integration
- Docker deployment support

