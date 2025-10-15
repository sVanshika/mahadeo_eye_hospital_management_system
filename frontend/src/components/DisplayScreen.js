import React, { useState, useEffect } from 'react';
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
  CheckCircle,
} from '@mui/icons-material';
import { useSocket } from '../contexts/SocketContext';
import { useOPD } from '../contexts/OPDContext';
import apiClient from '../apiClient';
import Navbar from './Navbar';

const DisplayScreen = () => {
  const { joinDisplay, leaveDisplay, onDisplayUpdate, removeAllListeners } = useSocket();
  const { activeOPDs, getOPDByCode } = useOPD();
  const [displayData, setDisplayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchDisplayData();
    joinDisplay();
    
    // Set up real-time updates
    onDisplayUpdate(() => {
      fetchDisplayData();
    });

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDisplayData, 30000);

    return () => {
      leaveDisplay();
      removeAllListeners();
      clearInterval(interval);
    };
  }, []);

  const fetchDisplayData = async () => {
    try {
      const response = await apiClient.get('/display/all');
      setDisplayData(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch display data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        flexDirection="column"
      >
        <Typography variant="h4" gutterBottom>
          Loading Display Data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <Navbar 
        onRefresh={fetchDisplayData} 
        pageTitle="Patient Queue Display"
        showRefresh={true}
      />

      <Container maxWidth="xl" sx={{ mt: 2, mb: 2 }}>
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
                      <Typography variant="h6" gutterBottom>
                        Currently Being Served
                      </Typography>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box>
                          <Typography variant="h4" component="div">
                            {opd.current_patient.token_number}
                          </Typography>
                          <Typography variant="h6">
                            {opd.current_patient.patient_name}
                          </Typography>
                        </Box>
                        <CheckCircle sx={{ fontSize: 40 }} />
                      </Box>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Waiting Time: {formatWaitingTime(opd.current_patient.waiting_time_minutes)}
                      </Typography>
                    </Paper>
                  )}

                  {/* Next Patients */}
                  <Typography variant="h6" gutterBottom>
                    Next in Queue ({opd.next_patients.length})
                  </Typography>
                  
                  {opd.next_patients.length > 0 ? (
                    <List dense>
                      {opd.next_patients.map((patient, index) => (
                        <React.Fragment key={index}>
                          <ListItem>
                            <ListItemIcon>
                              <Typography variant="h6" color="primary">
                                {patient.position}
                              </Typography>
                            </ListItemIcon>
                            <ListItemText
                              primary={patient.token_number}
                              secondary={patient.patient_name}
                            />
                            <Box display="flex" alignItems="center" gap={1}>
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

