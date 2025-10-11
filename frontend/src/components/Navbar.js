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
          <Avatar sx={{ mr: 1, bgcolor: 'secondary.main' }}>
            <LocalHospital />
          </Avatar>
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            Eye Hospital
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
