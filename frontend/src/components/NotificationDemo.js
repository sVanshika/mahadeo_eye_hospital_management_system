import React from 'react';
import { Button, Box, Typography, Paper } from '@mui/material';
import { useNotification } from '../contexts/NotificationContext';

const NotificationDemo = () => {
  const { showSuccess, showError, showWarning, showInfo } = useNotification();

  const handleSuccess = () => {
    showSuccess('Operation completed successfully!');
  };

  const handleError = () => {
    showError('Something went wrong. Please try again.');
  };

  const handleWarning = () => {
    showWarning('Please check your input before proceeding.');
  };

  const handleInfo = () => {
    showInfo('This is an informational message.');
  };

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Typography variant="h5" gutterBottom>
        Global Notification Demo
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Click the buttons below to test different notification types. 
        Notifications will appear in the top-right corner and auto-dismiss after 10 seconds.
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button 
          variant="contained" 
          color="success" 
          onClick={handleSuccess}
        >
          Show Success
        </Button>
        
        <Button 
          variant="contained" 
          color="error" 
          onClick={handleError}
        >
          Show Error
        </Button>
        
        <Button 
          variant="contained" 
          color="warning" 
          onClick={handleWarning}
        >
          Show Warning
        </Button>
        
        <Button 
          variant="contained" 
          color="info" 
          onClick={handleInfo}
        >
          Show Info
        </Button>
      </Box>
    </Paper>
  );
};

export default NotificationDemo;
