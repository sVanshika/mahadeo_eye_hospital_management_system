import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert, Slide } from '@mui/material';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// Slide transition for smooth appearance
function SlideTransition(props) {
  return <Slide {...props} direction="left" />;
}

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    type: 'info', // 'success', 'error', 'warning', 'info'
    duration: 10000, // 10 seconds default
  });

  const showNotification = useCallback((message, type = 'info', duration = 10000) => {
    // Ensure message is always a string to prevent React rendering errors
    let safeMessage = message;
    
    if (typeof message !== 'string') {
      if (Array.isArray(message)) {
        // Handle array of errors (e.g., validation errors)
        safeMessage = message.map(err => {
          if (typeof err === 'string') return err;
          if (err.msg && err.loc) return `${err.loc.join('.')}: ${err.msg}`;
          return JSON.stringify(err);
        }).join(', ');
      } else if (message && typeof message === 'object') {
        // Handle object errors
        try {
          safeMessage = JSON.stringify(message);
        } catch (e) {
          safeMessage = 'An error occurred';
        }
      } else {
        safeMessage = String(message);
      }
    }
    
    setNotification({
      open: true,
      message: safeMessage,
      type,
      duration,
    });
  }, []);

  const showSuccess = useCallback((message, duration = 10000) => {
    showNotification(message, 'success', duration);
  }, [showNotification]);

  const showError = useCallback((message, duration = 10000) => {
    showNotification(message, 'error', duration);
  }, [showNotification]);

  const showWarning = useCallback((message, duration = 10000) => {
    showNotification(message, 'warning', duration);
  }, [showNotification]);

  const showInfo = useCallback((message, duration = 10000) => {
    showNotification(message, 'info', duration);
  }, [showNotification]);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, open: false }));
  }, []);

  const value = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Global Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={notification.duration}
        onClose={hideNotification}
        TransitionComponent={SlideTransition}
        anchorOrigin={{ 
          vertical: 'top', 
          horizontal: 'right' 
        }}
        sx={{
          '& .MuiSnackbarContent-root': {
            minWidth: '300px',
          },
        }}
      >
        <Alert
          onClose={hideNotification}
          severity={notification.type}
          variant="filled"
          sx={{
            width: '100%',
            fontSize: '14px',
            fontWeight: 500,
            '& .MuiAlert-message': {
              width: '100%',
            },
          }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};
