import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
} from '@mui/material';
import {
  LocalHospital,
} from '@mui/icons-material';
import { useSocket } from '../contexts/SocketContext';
import { useOPD } from '../contexts/OPDContext';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../apiClient';
// Navbar removed - public display doesn't need authentication UI

const DisplayScreen = ({ opdCode = null }) => {
  const navigate = useNavigate();
  const { joinDisplay, leaveDisplay, onDisplayUpdate, removeAllListeners } = useSocket();
  const { allActiveOPDs, getOPDByCode, loading: opdsLoading } = useOPD();
  const { user, allowedOPDs, loading: authLoading } = useAuth();
  const [displayData, setDisplayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const isMountedRef = React.useRef(true);
  const hasValidatedRef = React.useRef(false);

  // Reset validation when opdCode changes
  useEffect(() => {
    isMountedRef.current = true;
    hasValidatedRef.current = false;
    setLoading(true);
    setError(null);
    
    return () => {
      isMountedRef.current = false;
    };
  }, [opdCode]);

  // Auto-redirect nurses with single OPD access to their specific display (better UX)
  // But if they have multiple OPDs or no OPDs, show all OPDs like reg/admin
  useEffect(() => {
    // Wait for auth and OPDs to load
    if (authLoading || opdsLoading) {
      return;
    }
    
    // Only redirect if on /display (no specific opdCode) and user is a nurse with single OPD
    if (!opdCode && user && user.role === 'nursing' && allowedOPDs && allowedOPDs.length === 1) {
      const singleOPD = allowedOPDs[0].toLowerCase();
      console.log(`🔀 Nurse with single OPD access, redirecting to: /display/${singleOPD}`);
      navigate(`/display/${singleOPD}`, { replace: true });
    }
  }, [opdCode, user, allowedOPDs, authLoading, opdsLoading, navigate]);

  // Fetch display data (wrapped in useCallback to prevent stale closures)
  const fetchDisplayData = useCallback(async () => {
    try {
      // Normalize opdCode to LOWERCASE to match database (opd1, opd2, opd3)
      const normalizedOpdCode = opdCode?.toLowerCase();
      
      let response;
      if (normalizedOpdCode) {
        // Fetch single OPD data
        response = await apiClient.get(`/display/opd/${normalizedOpdCode}`);
        
        // Validate response data
        if (!response.data) {
          throw new Error(`No data returned for ${normalizedOpdCode}`);
        }
        
        // Wrap in opds array for consistent data structure
        if (isMountedRef.current) {
          setDisplayData({ opds: [response.data], isSingleOPD: true });
          setLastUpdated(new Date());
          setError(null);
        }
      } else {
        // Fetch all OPDs data
        response = await apiClient.get('/display/all');
        
        if (!response.data || !response.data.opds) {
          throw new Error('Invalid response format from server');
        }
        
        // Display page shows all OPDs for all users (same as reg/admin)
        // OPD filtering is only applied in OPD Management page, not display page
        let filteredOPDs = response.data.opds;
        
        if (isMountedRef.current) {
          setDisplayData({ ...response.data, opds: filteredOPDs, isSingleOPD: false });
          setLastUpdated(new Date());
          setError(null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch display data:', error);
      if (isMountedRef.current) {
        setError(error.response?.data?.detail || error.message || 'Failed to load display data');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [opdCode]);

  // Main effect: Validate, fetch data, and set up real-time updates
  useEffect(() => {
    // Wait for OPDs to load before proceeding
    if (opdsLoading || authLoading || hasValidatedRef.current) {
      return;
    }
    
    // Normalize opdCode to LOWERCASE to match database (opd1, opd2, opd3)
    const normalizedOpdCode = opdCode?.toLowerCase();
    
    // Validate OPD code if single OPD mode (check against ALL active OPDs, not filtered ones)
    if (normalizedOpdCode && !opdsLoading) {
      const opdExists = getOPDByCode(normalizedOpdCode);
      if (!opdExists && allActiveOPDs.length > 0) {
        console.error(`❌ Invalid OPD: ${normalizedOpdCode} does not exist`);
        setError(`Invalid OPD: ${normalizedOpdCode} does not exist`);
        setLoading(false);
        hasValidatedRef.current = true;
        return;
      }
    }
    
    hasValidatedRef.current = true;
    console.log(`✅ Validation passed for ${normalizedOpdCode || 'all OPDs'}`);
    
    // Initial data fetch
    fetchDisplayData();
    
    // Join display room for real-time updates
    joinDisplay();
    
    // Set up real-time updates
    onDisplayUpdate((data) => {
      console.log('🔄 Display update triggered, fetching fresh data...', data);
      // If single OPD mode, only update if it's for this OPD or if opdCode not in event
      if (normalizedOpdCode && data?.opdCode) {
        const eventOpdCode = data.opdCode?.toLowerCase();
        if (eventOpdCode && eventOpdCode !== normalizedOpdCode) {
          console.log(`⏭️ Ignoring update for ${eventOpdCode}, current OPD is ${normalizedOpdCode}`);
          return; // Ignore updates for other OPDs
        }
      }
      fetchDisplayData();
    });

    // Auto-refresh every 5 seconds (reduced from 30s for better responsiveness)
    const interval = setInterval(() => {
      console.log('⏰ Auto-refresh triggered');
      fetchDisplayData();
    }, 5000);

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up display screen');
      leaveDisplay();
      removeAllListeners();
      clearInterval(interval);
    };
  }, [opdCode, opdsLoading, authLoading, allActiveOPDs.length, fetchDisplayData, joinDisplay, leaveDisplay, onDisplayUpdate, removeAllListeners, getOPDByCode]);

  const getStatusColor = (status) => {
    const statusColors = {
      pending: 'warning',
      in: 'info',
      dilated: 'secondary',
      referred: 'error',
      end_visit: 'success',
      completed: 'success',
    };
    return statusColors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const statusLabels = {
      pending: 'Waiting',
      in: 'In OPD',
      dilated: 'Dilated',
      referred: 'Referred',
      end_visit: 'Completed',
      completed: 'Completed',
    };
    return statusLabels[status] || status;
  };

  const formatWaitingTime = (waitingTime) => {
    if (!waitingTime) return 'N/A';
    return `${waitingTime} min`;
  };

  // Show loading while OPDs are loading OR display data is loading OR auth is loading
  if (loading || opdsLoading || authLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        flexDirection="column"
        sx={{ bgcolor: '#f5f5f5' }}
      >
        <Paper elevation={3} sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom sx={{ fontSize: '3rem', fontWeight: 'bold' }}>
            Loading Display...
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2, fontSize: '1.5rem' }}>
            {authLoading ? 'Loading user data...' : opdsLoading ? 'Loading OPD configuration...' : 'Loading queue data...'}
          </Typography>
        </Paper>
      </Box>
    );
  }

  // Error State
  if (error) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        flexDirection="column"
        sx={{ bgcolor: '#f5f5f5', p: 4 }}
      >
        <Paper elevation={3} sx={{ p: 6, maxWidth: 600, textAlign: 'center', bgcolor: 'error.light' }}>
          <Typography variant="h3" gutterBottom color="error.dark" sx={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>
            ERROR
          </Typography>
          <Typography variant="h6" sx={{ mt: 2, mb: 4, color: 'error.dark' }}>
            {error}
          </Typography>
          <Box sx={{ mt: 4 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Please check:
            </Typography>
            <Typography variant="body2" component="ul" sx={{ textAlign: 'left', ml: 4 }}>
              <li>The OPD code is correct (OPD1, OPD2, or OPD3)</li>
              <li>The backend server is running</li>
              <li>Your network connection is stable</li>
            </Typography>
          </Box>
        </Paper>
      </Box>
    );
  }

  // Single OPD Full-Screen Layout
  if (displayData?.isSingleOPD && displayData?.opds?.[0]) {
    const opd = displayData.opds[0];
    const opdName = getOPDByCode(opd.opd_type)?.opd_name || opd.opd_type;
  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#f5f5f5', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Simple Header for LED Display */}
      <Paper elevation={3} sx={{ bgcolor: 'primary.main', color: 'white', py: 3, mb: 2, textAlign: 'center' }}>
        <Typography variant="h3" sx={{ fontWeight: 700, fontSize: '3rem', letterSpacing: '1px', fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif' }}>
          Mahadeo Singhi Eye Hospital
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 500, fontSize: '2rem', letterSpacing: '0.5px', mt: 1, opacity: 0.95 }}>
          {opdName}
        </Typography>
      </Paper>

      <Container maxWidth={false} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', py: 2, px: 4, width: '100%' }}>
          {lastUpdated && (
            <Typography variant="h6" color="text.secondary" align="center" gutterBottom>
              Last Updated: {lastUpdated.toLocaleTimeString()}
            </Typography>
          )}

          {/* Current Patient - Large Display */}
          {opd.current_patient ? (
            <Paper
              elevation={6}
              sx={{
                p: 6,
                mb: 4,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                textAlign: 'center',
                width: '100%',
              }}
            >
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', fontSize: '2.5rem', letterSpacing: '1px' }}>
                CURRENTLY BEING SERVED
              </Typography>
              <Box display="flex" alignItems="center" justifyContent="center" my={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h2" component="div" sx={{ fontWeight: 'bold', fontSize: '5rem', letterSpacing: '2px' }}>
                    {opd.current_patient.token_number.slice(-3)} - {opd.current_patient.patient_name}
                  </Typography>
                  
                </Box>
              </Box>
            </Paper>
          ) : (
            <Paper
              elevation={6}
              sx={{
                p: 6,
                mb: 4,
                bgcolor: 'grey.300',
                color: 'text.primary',
                textAlign: 'center',
              }}
            >
              <Typography variant="h3" sx={{ fontWeight: 'bold', fontSize: '3rem' }}>
                No Patient Currently Being Served
              </Typography>
            </Paper>
          )}

          {/* Next Patients - Large List */}
          <Card sx={{ flexGrow: 1, width: '100%' }}>
            <CardContent sx={{ px: 4 }}>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', fontSize: '2.5rem', mb: 3, letterSpacing: '1px' }}>
                NEXT IN QUEUE ({opd.next_patients?.length || 0})
              </Typography>
              
              {opd.next_patients && opd.next_patients.length > 0 ? (
                <List sx={{ width: '100%' }}>
                  {opd.next_patients.map((patient, index) => (
                    <React.Fragment key={index}>
                      <ListItem 
                        sx={{ 
                          py: 3,
                          px: 2,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3
                        }}
                      >
                        {/* Position Number */}
                        <Box 
                          sx={{ 
                            minWidth: '80px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                        >
                          <Typography 
                            variant="h3" 
                            color="primary" 
                            sx={{ 
                              fontWeight: 'bold', 
                              fontSize: '3rem',
                              lineHeight: 1
                            }}
                          >
                            {patient.position}
                          </Typography>
                        </Box>

                        {/* Patient Info */}
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography 
                            variant="h4" 
                            sx={{ 
                              fontSize: '2.5rem', 
                              fontWeight: 'bold',
                              lineHeight: 1.2,
                              mb: 0.5
                            }}
                          >
                            {patient.token_number.slice(-3)} - {patient.patient_name}
                          </Typography>
                          
                        </Box>

                        {/* Status Chips */}
                        <Box display="flex" alignItems="center" gap={2} sx={{ flexShrink: 0 }}>
                          <Chip
                            label={getStatusLabel(patient.status)}
                            color={getStatusColor(patient.status)}
                            sx={{ 
                              fontSize: '1.5rem', 
                              padding: '24px 16px', 
                              height: 'auto',
                              fontWeight: 'bold'
                            }}
                          />
                          {patient.is_dilated && (
                            <Chip
                              label="Dilated"
                              color="secondary"
                              sx={{ 
                                fontSize: '1.5rem', 
                                padding: '24px 16px', 
                                height: 'auto',
                                fontWeight: 'bold'
                              }}
                            />
                          )}
                        </Box>
                      </ListItem>
                      {index < opd.next_patients.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="h5" color="text.secondary" align="center" sx={{ py: 4, fontSize: '2rem' }}>
                  No patients in queue
                </Typography>
              )}

              {/* Queue Statistics */}
              <Box mt={4} p={3} bgcolor="grey.100" borderRadius={2}>
                <Typography variant="h5" color="text.primary" sx={{ fontSize: '2rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                  TOTAL PATIENTS: {opd.total_patients}
                </Typography>
                {opd.estimated_wait_time && (
                  <Typography variant="h5" color="text.primary" sx={{ fontSize: '2rem', mt: 1, letterSpacing: '0.5px' }}>
                    EST. WAIT TIME: {opd.estimated_wait_time} minutes
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  // All OPDs Grid Layout (Original)
  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Simple Header for LED Display */}
      <Paper elevation={3} sx={{ bgcolor: 'primary.main', color: 'white', py: 3, mb: 2, textAlign: 'center' }}>
        <Typography variant="h3" sx={{ fontWeight: 700, fontSize: '3rem', letterSpacing: '1px', fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif' }}>
          Mahadeo Singhi Eye Hospital
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 500, fontSize: '2rem', letterSpacing: '0.5px', mt: 1, opacity: 0.95 }}>
          Patient Queue Display
        </Typography>
      </Paper>

      <Container maxWidth={false} sx={{ mt: 2, mb: 2, px: 3, width: '100%' }}>
        {lastUpdated && (
          <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
            Last Updated: {lastUpdated.toLocaleTimeString()}
          </Typography>
        )}

        <Grid container spacing={3}>
          {displayData?.opds?.map((opd) => (
            <Grid item xs={12} md={4} key={opd.opd_type}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <LocalHospital color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h5" component="h2">
                      {getOPDByCode(opd.opd_type)?.opd_name || opd.opd_type.toUpperCase()}
                    </Typography>
                  </Box>

                  {/* Current Patient */}
                  {opd.current_patient && (
                    <Paper
                      elevation={3}
                      sx={{
                        p: 2,
                        mb: 2,
                        bgcolor: 'primary.light',
                        color: 'primary.contrastText',
                      }}
                    >
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>
                        CURRENTLY BEING SERVED
                      </Typography>
                      <Box>
                        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>
                          {opd.current_patient.token_number.slice(-3)} - {opd.current_patient.patient_name}
                        </Typography>
                        
                      </Box>
                    </Paper>
                  )}

                  {/* Next Patients */}
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>
                    NEXT IN QUEUE ({opd.next_patients?.length || 0})
                  </Typography>
                  
                  {opd.next_patients && opd.next_patients.length > 0 ? (
                    <List dense sx={{ width: '100%' }}>
                      {opd.next_patients.map((patient, index) => (
                        <React.Fragment key={index}>
                          <ListItem sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1 }}>
                            {/* Position Number */}
                            <Box sx={{ minWidth: '35px', display: 'flex', justifyContent: 'center' }}>
                              <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                                {patient.position}
                              </Typography>
                            </Box>
                            
                            {/* Patient Info */}
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                              <Typography 
                                variant="body1" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  overflow: 'hidden', 
                                  textOverflow: 'ellipsis', 
                                  whiteSpace: 'nowrap',
                                  lineHeight: 1.3
                                }}
                              >
                                {patient.token_number.slice(-3)} - {patient.patient_name}
                              </Typography>
                              
                            </Box>
                            
                            {/* Status Chips */}
                            <Box display="flex" alignItems="center" gap={1} sx={{ flexShrink: 0 }}>
                              <Chip
                                label={getStatusLabel(patient.status)}
                                color={getStatusColor(patient.status)}
                                size="small"
                              />
                              {patient.is_dilated && (
                                <Chip
                                  label="Dilated"
                                  color="secondary"
                                  size="small"
                                />
                              )}
                            </Box>
                          </ListItem>
                          {index < opd.next_patients.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary" align="center">
                      No patients in queue
                    </Typography>
                  )}

                  {/* Queue Statistics */}
                  <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
                    <Typography variant="body2" color="text.secondary">
                      Total Patients: {opd.total_patients}
                    </Typography>
                    {opd.estimated_wait_time && (
                      <Typography variant="body2" color="text.secondary">
                        Est. Wait Time: {opd.estimated_wait_time} minutes
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Summary Statistics */}
        {displayData && (
          <Box mt={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Today's Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="primary">
                        {displayData.opds.reduce((sum, opd) => sum + opd.total_patients, 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Patients
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="warning.main">
                        {displayData.opds.reduce((sum, opd) => sum + opd.next_patients.length, 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Waiting
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="info.main">
                        {displayData.opds.filter(opd => opd.current_patient).length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Being Served
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="success.main">
                        {displayData.opds.reduce((sum, opd) => 
                        sum + opd.next_patients.filter(p => p.is_dilated).length, 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Dilated
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default DisplayScreen;

