import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Box } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { OPDProvider } from './contexts/OPDContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PatientRegistration from './components/PatientRegistration';
import OPDManagement from './components/OPDManagement';
import AdminPanel from './components/AdminPanel';
import DisplayScreen from './components/DisplayScreen';
import ProtectedRoute from './components/ProtectedRoute';

// Wrapper component to extract opdCode from URL params
function DisplayScreenWrapper() {
  const { opdCode } = useParams();
  return <DisplayScreen opdCode={opdCode} />;
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <OPDProvider>
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
              <Routes>
              <Route path="/login" element={<Login />} />
              {/* Public Display Routes - No Authentication Required */}
              <Route path="/display" element={<DisplayScreen />} />
              {/* Dynamic route - works for ANY OPD (opd1, opd2, opd3, opd4, opd5, etc.) */}
              <Route path="/display/:opdCode" element={<DisplayScreenWrapper />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/registration"
                element={
                  <ProtectedRoute allowedRoles={['registration', 'admin']}>
                    <PatientRegistration />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/opd"
                element={
                  <ProtectedRoute allowedRoles={['nursing', 'admin']}>
                    <OPDManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/login" replace />} />
              </Routes>
            </Box>
          </OPDProvider>
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;

