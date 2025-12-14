import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Avatar,
} from '@mui/material';
import {
  ExitToApp,
  Refresh,
  LocalHospital,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Link } from "react-router-dom";
// Hospital logo from public folder
const hospitalLogo = "/hospital-logo.png";



const Navbar = ({ onRefresh, showRefresh = true, pageTitle = "" }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleDisplayName = (role) => {
    const roleMap = {
      admin: 'Administrator',
      registration: 'Registration Staff',
      nursing: 'Nursing Staff',
    };
    return roleMap[role] || role;
  };

  return (
    <AppBar position="static" sx={{ backgroundColor: '#1976d2' }}>
      <Toolbar>
        {/* Logo and Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
        <Link to="/dashboard" style={{ textDecoration: "none" }}>
          <Avatar src={hospitalLogo}
                  alt="Hospital Logo"
                  variant="rounded" 
                  sx={{ mr: 1.5, width: 40, height: 40 }}>
            <LocalHospital />
          </Avatar>
          </Link>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              fontWeight: 600,
              fontSize: '1.25rem',
              letterSpacing: '0.5px',
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
              textTransform: 'none'
            }}
          >
            Mahadeo Singhi Eye and Multispeciality Hospital
          </Typography>
        </Box>

        {/* Page Title */}
        {pageTitle && (
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, ml: 2 }}>
            {pageTitle}
          </Typography>
        )}

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* User Info and Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ mr: 1 }}>
            {user?.username} ({getRoleDisplayName(user?.role)})
          </Typography>
          
          {showRefresh && onRefresh && (
            <IconButton color="inherit" onClick={onRefresh} size="small">
              <Refresh />
            </IconButton>
          )}
          
          <Button 
            color="inherit" 
            onClick={handleLogout} 
            startIcon={<ExitToApp />}
            size="small"
          >
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
