import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  TextField,
  Select,
  MenuItem,
  Paper,
  Typography,
  Typography as MuiTypography,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Refresh,
  PlayArrow,
  Visibility,
  PersonAdd,
  CheckCircle,
  Schedule,
  Undo,
  SkipNext,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useNotification } from '../contexts/NotificationContext';
import { useOPD } from '../contexts/OPDContext';
import apiClient from '../apiClient';
import Navbar from './Navbar';

const OPDManagement = () => {
  const navigate = useNavigate();
  const { joinOPD, leaveOPD, onQueueUpdate, removeAllListeners } = useSocket();
  const { showSuccess, showError } = useNotification();
  const { activeOPDs, allActiveOPDs, getOPDByCode } = useOPD();
  const [selectedOpd, setSelectedOpd] = useState('');
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionDialog, setActionDialog] = useState({ open: false, type: '', patient: null });
  const [referredFromHere, setReferredFromHere] = useState([]); // referred from selectedOpd to elsewhere
  const [referredToHere, setReferredToHere] = useState([]);     // referred from elsewhere to selectedOpd
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [endVisitDialogOpen, setEndVisitDialogOpen] = useState(false);
  const [returnReferralDialogOpen, setReturnReferralDialogOpen] = useState(false);
  const [selectedPatientForReturn, setSelectedPatientForReturn] = useState(null);
  const [returnRemarks, setReturnRemarks] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);
  const [hasBeenDilated, setHasBeenDilated] = useState({}); // Track if patients have ever been dilated

  // Set default OPD when activeOPDs are loaded
  useEffect(() => {
    // console.log('activeOPDs changed:', activeOPDs);
    // console.log('selectedOpd:', selectedOpd);

    if (activeOPDs.length > 0 && !selectedOpd) {
      console.log('Setting default OPD to:', activeOPDs[0].opd_code);
      setSelectedOpd(activeOPDs[0].opd_code);
    }
  }, [activeOPDs, selectedOpd]);

  useEffect(() => {
    // Only make API calls if selectedOpd is available
    if (selectedOpd) {
      fetchQueueData();
      fetchStats();
      fetchReferred();
      
      // Join OPD room for real-time updates
      joinOPD(selectedOpd);
      
      // Set up socket listeners
      onQueueUpdate((data) => {
        if (data.opd_type === selectedOpd) {
          setQueue(data.queue);
        }
      });

      return () => {
        leaveOPD(selectedOpd);
        removeAllListeners();
      };
    }
  }, [selectedOpd]);

  const fetchQueueData = async () => {
    if (!selectedOpd) {
      //console.log('No selectedOpd, skipping fetchQueueData');
      return;
    }
    try {
      //console.log(`=== FETCHING QUEUE FOR OPD: ${selectedOpd} ===`);
      const response = await apiClient.get(`/opd/${selectedOpd}/queue`);
      //console.log(`Queue API Response:`, response);
      //console.log(`Queue data received:`, response.data);
      //console.log(`Number of patients in queue:`, response.data?.length || 0);
      setQueue(response.data);
      //console.log(`Queue state updated. Current queue:`, response.data);
    } catch (error) {
      console.error('=== QUEUE FETCH ERROR ===');
      console.error('Error:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
    }
  };

  const fetchStats = async () => {
    if (!selectedOpd) {
      //console.log('No selectedOpd, skipping fetchStats');
      return;
    }
    try {
      //console.log(`Fetching stats for OPD: ${selectedOpd}`);
      const response = await apiClient.get(`/opd/${selectedOpd}/stats`);
      setStats(response.data);
      //console.log(`\n\nStats data:`, response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchReferred = async () => {
    if (!selectedOpd) {
      //console.log('No selectedOpd, skipping fetchReferred');
      return;
    }
    try {
      //console.log(`\n\nFetching referred patients from ${selectedOpd}`);
      //console.log(`\n\nFetching referred patients to ${selectedOpd}`);
      const [fromResp, toResp] = await Promise.all([
        apiClient.get(`/patients/referred`, { params: { from_opd: selectedOpd } }),
        apiClient.get(`/patients/referred`, { params: { to_opd: selectedOpd } })
      ]);
      // Ensure data is an array
      const fromData = Array.isArray(fromResp.data) ? fromResp.data : [];
      const toData = Array.isArray(toResp.data) ? toResp.data : [];
      //console.log('Referred FROM data:', fromData);
      //console.log('Referred TO data:', toData);
      setReferredFromHere(fromData);
      setReferredToHere(toData);
    } catch (error) {
      console.error('Failed to fetch referred patients:', error);
      console.error('Error response:', error.response);
      setReferredFromHere([]);
      setReferredToHere([]);
    }
  };

  const handleCallNext = async () => {
    setLoading(true);
    try {
      const response = await apiClient.post(`/opd/${selectedOpd}/call-next`);
      showSuccess(response.data.message);
      fetchQueueData();
      fetchStats();
      fetchReferred();
    } catch (error) {
      showError(error.response?.data?.detail || 'Failed to call next patient');
    } finally {
      setLoading(false);
    }
  };

  const handleDilatePatient = (patient) => {
    // Mark this patient as having been dilated (one-time confirmation)
    setHasBeenDilated(prev => ({
      ...prev,
      [patient.patient_id]: true
    }));
    
    setActionDialog({
      open: true,
      type: 'dilate',
      patient: patient,
    });
  };

  const handleReferPatient = (patient) => {
    setActionDialog({
      open: true,
      type: 'refer',
      patient: patient,
    });
  };

  const handleReturnDilated = (patient) => {
    setActionDialog({
      open: true,
      type: 'return_dilated',
      patient: patient,
    });
  };

  const handleEndVisit = (patient) => {
    //console.log(`\n\nEnding visit for patient ${patient.token_number}`);
    setSelectedPatient(patient);
    setEndVisitDialogOpen(true);
  };

  const confirmEndVisit = async () => {
    //console.log(`\n\nEnding visit for patient ${selectedPatient.token_number}`);
  
    if (!selectedPatient || !selectedOpd) return;
      //console.log(`\n\nPatient not here:`, selectedPatient);
    try {
      await apiClient.post(`/patients/${selectedPatient.patient_id}/endvisit`);

      showSuccess(`Patient ${selectedPatient.token_number} visit completed`);
      setEndVisitDialogOpen(false);
      setSelectedPatient(null);

      fetchQueueData();

    } catch (error) {
      showError(error.response?.data?.detail || 'OPD allocation failed');
    }
  };


  const confirmAction = async () => {
    const { type, patient } = actionDialog;
    setLoading(true);

    try {
      if (type === 'dilate') {
        const remarks = actionDialog.remarks || '';
        await apiClient.post(`/opd/${selectedOpd}/dilate-patient/${patient.patient_id}`,{
          remarks: remarks
        });
        showSuccess(`Patient ${patient.token_number} marked for dilation`);
      } else if (type === 'refer') {
        const targetOpd = actionDialog.targetOpd;
        const remarks = actionDialog.remarks || '';
        //console.log('Referring patient:', { patient_id: patient.patient_id, to_opd: targetOpd, remarks });
        await apiClient.post(`/patients/${patient.patient_id}/refer`, {
          to_opd: targetOpd,
          remarks: remarks
        });
        showSuccess(`Patient ${patient.token_number} referred to ${targetOpd.toUpperCase()}`);
      } else if (type === 'return_dilated') {
        await apiClient.post(`/opd/${selectedOpd}/return-dilated/${patient.patient_id}`);
        showSuccess(`Patient ${patient.token_number} returned from dilation`);
      } else if (type === 'end_visit') {
        await apiClient.post(`/patients/${patient.patient_id}/endvisit`);
        showSuccess(`Patient ${patient.token_number} visit completed`);
        
      }
      
      setActionDialog({ open: false, type: '', patient: null });
      fetchQueueData();
      fetchStats();
      fetchReferred();
    } catch (error) {
      console.error('Action error:', error);
      console.error('Error response:', error.response);
      // Handle validation errors from Pydantic
      let errorMessage = 'Action failed';
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          // Pydantic validation error
          errorMessage = error.response.data.detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ');
        } else if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        }
      }
      showError(errorMessage);
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

  const getStatusLabel = (status, dilation_time) => {
    const statusLabels = {
      pending: 'Waiting',
      in: 'In OPD',
      dilated: 'Dilated',
      referred: 'Referred',
      end_visit: 'Completed',
      completed: 'Completed',
    };
    let label = statusLabels[status] || status;
    if(status === 'dilated')
      label = label + " - " + formatWaitingTime(dilation_time);
    return label;
  };

  const formatWaitingTime = (registrationTime) => {
    const now = new Date();
    const regTime = new Date(registrationTime);
    const diffMinutes = Math.floor((now - regTime) / (1000 * 60));
    let hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    const days = Math.floor(hours / 24);
    hours = hours % 24;
    return ` ${days}d ${hours}h ${minutes}m`;
  };

  const isDilatedForMoreThan30Mins = (dilationTime) => {
    const now = new Date();
    const dilatedAt = new Date(dilationTime);
    const diffMilliseconds = now.getTime() - dilatedAt.getTime();
    const diffMinutes = diffMilliseconds / (1000 * 60);
    return diffMinutes > 30;
  };

  const handleReturnFromReferral = (patient) => {
    console.log("handleReturnFromReferral")
    setSelectedPatientForReturn(patient);
    setReturnRemarks(''); // Clear previous remarks
    setReturnReferralDialogOpen(true);
  };

  const confirmReturnFromReferral = async () => {
    if (!selectedPatientForReturn) return;

    setReturnLoading(true);
    try {
      await apiClient.post(`/patients/${selectedPatientForReturn.patient_id}/return-from-referral`, {
        opd_code: selectedOpd, // This is the OPD the patient was referred TO, and is now returning FROM
        remarks: returnRemarks,
      });
      showSuccess(`Patient ${selectedPatientForReturn.patient_name} returned to original OPD.`);
      setReturnReferralDialogOpen(false);
      fetchQueueData(); // Refresh the queue
    } catch (error) {
      console.error('Error returning patient from referral:', error);
      showError(error.response?.data?.detail || 'Failed to return patient from referral.');
    } finally {
      setReturnLoading(false);
    }
  };

  // New handler: Send back to queue
  const handleSendBackToQueue = async (patient) => {
    if (!window.confirm(`Send ${patient.patient_name} (${patient.token_number}) back to queue?`)) {
      return;
    }

    setLoading(true);
    try {
      await apiClient.post(`/opd/${selectedOpd}/send-back-to-queue/${patient.patient_id}`);
      showSuccess(`Patient ${patient.token_number} sent back to queue`);
      fetchQueueData();
      fetchStats();
    } catch (error) {
      showError(error.response?.data?.detail || 'Failed to send patient back to queue');
    } finally {
      setLoading(false);
    }
  };

  // New handler: Call out of order
  const handleCallOutOfOrder = async (patient) => {
    if (!window.confirm(`Call ${patient.patient_name} (${patient.token_number}) out of order?`)) {
      return;
    }

    setLoading(true);
    try {
      await apiClient.post(`/opd/${selectedOpd}/call-out-of-order/${patient.patient_id}`);
      showSuccess(`Patient ${patient.token_number} called out of order`);
      fetchQueueData();
      fetchStats();
    } catch (error) {
      showError(error.response?.data?.detail || 'Failed to call patient out of order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Navbar 
        onRefresh={() => {
          fetchQueueData();
          fetchStats();
          fetchReferred();
        }} 
        pageTitle={`OPD Management - ${getOPDByCode(selectedOpd)?.opd_name || selectedOpd.toUpperCase()}`}
      />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* OPD Selection */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Select OPD
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>OPD</InputLabel>
                  <Select
                    value={selectedOpd}
                    onChange={(e) => setSelectedOpd(e.target.value)}
                    label="OPD"
                  >
                    {activeOPDs.map((opd) => (
                      <MenuItem key={opd.opd_code} value={opd.opd_code}>
                        {opd.opd_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Statistics */}
        {stats && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <MuiTypography variant="h4" color="primary">
                  {stats.total_patients}
                </MuiTypography>
                <MuiTypography variant="body2" color="text.secondary">
                  Total Patients
                </MuiTypography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <MuiTypography variant="h4" color="warning.main">
                  {stats.pending_patients}
                </MuiTypography>
                <MuiTypography variant="body2" color="text.secondary">
                  Pending
                </MuiTypography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <MuiTypography variant="h4" color="info.main">
                  {stats.in_opd_patients}
                </MuiTypography>
                <MuiTypography variant="body2" color="text.secondary">
                  In OPD
                </MuiTypography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <MuiTypography variant="h4" color="success.main">
                  {stats.completed_today}
                </MuiTypography>
                <MuiTypography variant="body2" color="text.secondary">
                  Completed Today
                </MuiTypography>
              </Paper>
            </Grid>
          </Grid>
        )}


        <Grid container spacing={3}>
          {/* Queue Management */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Patient Queue ({queue.length} patients)
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<PlayArrow />}
                    onClick={handleCallNext}
                    disabled={loading || queue.length === 0}
                  >
                    Call Next Patient
                  </Button>
                </Box>
                
                <Box
                  sx={{maxHeight: "75vh", overflowY: "auto", pr: 1,

                    "&::-webkit-scrollbar": {
                      width: "8px",
                    },
                    "&::-webkit-scrollbar-track": {
                      background: "#f1f1f1",
                      borderRadius: "10px",
                    },
                    "&::-webkit-scrollbar-thumb": {
                      background: "#b0b0b0",
                      borderRadius: "10px",
                    },
                    "&::-webkit-scrollbar-thumb:hover": {
                      background: "#888",
                    }
                  }}
                >


                <List style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  {queue.map((patient, index) => (
                    <React.Fragment key={patient.id}>
                      <ListItem sx={{ display: "flex", flexDirection: "column", 
                        alignItems: "flex-start",
                        ...(patient.status === 'dilated' && isDilatedForMoreThan30Mins(patient.dilation_time) && {
                          backgroundColor: "#FEF3C6"
                        })}}>
  
                        {/* Row 1: Name + Waiting */}
                        <Box sx={{ 
                          width: "100%", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "space-between" 
                        }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <span>
                              {patient.position}. {patient.token_number.split("-")[1]} - {patient.patient_name}
                            </span>
                            <span style={{ color: "#888", fontSize: "0.85rem" }}>
                              | Waiting: {formatWaitingTime(patient.registration_time)} {(patient.dilation_flag && (
                                <span>| Dilated Patient</span>
                              ))} 
                            </span>
                            {/* {hasBeenDilated[patient.patient_id] && (
                              <span style={{ color: "#1976d2", fontSize: "0.85rem", fontWeight: "500" }}>
                                | Dilated Patient
                              </span>
                            )} */}
                          </Box>

                          {/* Status Chip on right of row 1 */}
                          
                        </Box>

                        {/* Row 2: BUTTONS (aligned right) */}
                        <Box 
                          sx={{
                            width: "100%",
                            display: "flex",
                            justifyContent: "space-between",
                            mt: 1,
                            gap: 1,
                            flexWrap: "wrap"
                          }}
                        >
                          <Chip
                            label={getStatusLabel(patient.status, patient.dilation_time)}
                            color={getStatusColor(patient.status)}
                            size="small"
                          />
                          <div>

                          {/* Return from Referral */}
                          {patient.is_referred && (
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleReturnFromReferral(patient)}
                              color="warning"
                              style={{marginLeft: '10px'}}
                            >
                              Return
                            </Button>
                          )}

                          {/* Send Back */}
                          {patient.status === 'in' && (
                            <Tooltip title="Send patient back to queue (if called by mistake)">
                              <Button
                                variant="outlined"
                                size="small"
                                color="secondary"
                                startIcon={<Undo />}
                                onClick={() => handleSendBackToQueue(patient)}
                                disabled={loading}
                                className='opdbutton'
                              >
                                Send Back
                              </Button>
                            </Tooltip>
                          )}

                          {/* Call Now */}
                          {(patient.status === 'pending' || patient.status === 'dilated') && (
                            <Tooltip title="Call this patient out of order">
                              <Button
                                style={{marginLeft: '10px'}}
                                variant="outlined"
                                size="small"
                                color="success"
                                startIcon={<SkipNext />}
                                onClick={() => handleCallOutOfOrder(patient)}
                                disabled={loading}
                              >
                                Call Now
                              </Button>
                            </Tooltip>
                          )}

                          {/* Dilate */}
                          {patient.status !== 'dilated' && (
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleDilatePatient(patient)}
                              disabled={patient.status !== 'in'}
                              style={{marginLeft: '10px'}}
                            >
                              Dilate
                            </Button>
                          )}

                          {/* End Dilation */}
                          {patient.status === 'dilated' && (
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleReturnDilated(patient)}
                              style={{marginLeft: '10px'}}
                            >
                              End Dilation
                            </Button>
                          )}

                          {/* Refer */}
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleReferPatient(patient)}
                            disabled={patient.status !== 'in'}
                            style={{marginLeft: '10px'}}
                          >
                            Refer
                          </Button>

                          

                          {/* End Visit */}
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleEndVisit(patient)}
                            color="error"
                            style={{marginLeft: '10px'}}
                          >
                            END VISIT
                          </Button>
                          </div>
                        </Box>
                      </ListItem>

                      {index < queue.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>

                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Actions */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Button
                    variant="outlined"
                    startIcon={<Visibility />}
                    onClick={() => navigate('/display')}
                    fullWidth
                  >
                    View Display Screen
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={fetchQueueData}
                    fullWidth
                  >
                    Refresh Queue
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

      {/* Referred Patients Dashboard */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Referred Patients (OPD: {selectedOpd.toUpperCase()})
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Referred FROM this OPD
                  </Typography>
                  <Box
                  sx={{maxHeight: "60vh", overflowY: "auto", pr: 1,

                    "&::-webkit-scrollbar": {
                      width: "8px",
                    },
                    "&::-webkit-scrollbar-track": {
                      background: "#f1f1f1",
                      borderRadius: "10px",
                    },
                    "&::-webkit-scrollbar-thumb": {
                      background: "#b0b0b0",
                      borderRadius: "10px",
                    },
                    "&::-webkit-scrollbar-thumb:hover": {
                      background: "#888",
                    }
                  }}
                >

                  <List>
                    {referredFromHere.length === 0 && (
                      <ListItem>
                        <ListItemText primary="No referred patients from this OPD" />
                      </ListItem>
                    )}
                    {referredFromHere.map((p) => (
                      <ListItem key={`from-${p.id}`} divider>
                        <ListItemText
                          primary={`${p.token_number.split("-")[1]} - ${p.name}`}
                          secondary={`To: ${p.to_opd?.toUpperCase()} | Registered: ${new Date(p.registration_time).toLocaleString()}`}
                        />
                        <ListItemSecondaryAction>
                          {/* <Chip label="Referred" color="error" size="small" /> */}
                          <Chip
                              label={getStatusLabel(p.current_queue_status)}
                              color={getStatusColor(p.current_queue_status)}
                              size="small"
                            />
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                
                </Box>
                
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Referred TO this OPD
                  </Typography>

                  <Box
                  sx={{maxHeight: "60vh", overflowY: "auto", pr: 1,

                    "&::-webkit-scrollbar": {
                      width: "8px",
                    },
                    "&::-webkit-scrollbar-track": {
                      background: "#f1f1f1",
                      borderRadius: "10px",
                    },
                    "&::-webkit-scrollbar-thumb": {
                      background: "#b0b0b0",
                      borderRadius: "10px",
                    },
                    "&::-webkit-scrollbar-thumb:hover": {
                      background: "#888",
                    }
                  }}
                >


                  <List>
                    {referredToHere.length === 0 && (
                      <ListItem>
                        <ListItemText primary="No patients referred to this OPD" />
                      </ListItem>
                    )}
                    {referredToHere.map((p) => (
                      <ListItem key={`to-${p.id}`} divider>
                        <ListItemText
                          primary={`${p.token_number.split("-")[1]} - ${p.name}`}
                          secondary={`From: ${p.from_opd?.toUpperCase() || 'N/A'} | Registered: ${new Date(p.registration_time).toLocaleString()}`}
                        />
                        <ListItemSecondaryAction>
                          {/* <Chip label="Referred" color="error" size="small" /> */}
                          <Chip
                              label={getStatusLabel(p.current_queue_status)}
                              color={getStatusColor(p.current_queue_status)}
                              size="small"
                            />
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>

                </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

        {/* Action Dialog */}
        <Dialog open={actionDialog.open} 
          onClose={() => setActionDialog({ open: false, type: '', patient: null })}
          fullWidth>
          <DialogTitle>
            {actionDialog.type === 'dilate' && 'Dilate Patient'}
            {actionDialog.type === 'refer' && 'Refer Patient'}
            {actionDialog.type === 'return_dilated' && 'Return Dilated Patient'}
          </DialogTitle>
          <DialogContent>
            {actionDialog.patient && (
              <Typography variant="body1" gutterBottom>
                Patient: {actionDialog.patient.patient_name} ({actionDialog.patient.token_number})
              </Typography>
            )}
            
             {actionDialog.type === 'refer' && (
               <FormControl fullWidth sx={{ mt: 2 }}>
                 <InputLabel>Refer to OPD</InputLabel>
                 <Select
                   value={actionDialog.targetOpd || ''}
                   onChange={(e) => setActionDialog(prev => ({ ...prev, targetOpd: e.target.value }))}
                   label="Refer to OPD"
                 >
                   {allActiveOPDs.filter(opd => opd.opd_code !== selectedOpd).map((opd) => (
                     <MenuItem key={opd.opd_code} value={opd.opd_code}>
                       {opd.opd_name}
                     </MenuItem>
                   ))}
                 </Select>
              <TextField
                  label="Remarks (Optional)"
                  multiline
                  rows={3}
                  fullWidth
                  sx={{ mt: 2 }}
                  value={actionDialog.remarks || ''}
                  onChange={(e) => setActionDialog(prev => ({ ...prev, remarks: e.target.value }))}
                />
              </FormControl>
            )}
            
            {actionDialog.type === 'dilate' && (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Patient will be given dilation drops and wait 30-40 minutes before returning.
                </Typography>
                <TextField
                  label="Remarks (Optional)"
                  multiline
                  rows={3}
                  fullWidth
                  sx={{ mt: 2 }}
                  value={actionDialog.remarks || ''}
                  onChange={(e) => setActionDialog(prev => ({ ...prev, remarks: e.target.value }))}
                />
              </FormControl>
              
              

            )}
            
            {actionDialog.type === 'return_dilated' && (
              <Typography variant="body2" color="text.secondary">
                Patient is returning from dilation area.
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setActionDialog({ open: false, type: '', patient: null })}>
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              variant="contained"
              disabled={loading || (actionDialog.type === 'refer' && !actionDialog.targetOpd)}
            >
              {loading ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={returnReferralDialogOpen} 
          onClose={() => setReturnReferralDialogOpen(false)}
          fullWidth
        >
          <DialogTitle>Referred Patient. End Visit in current OPD and send back to the original OPD</DialogTitle>
          <DialogContent>
            <Typography variant="body1" gutterBottom>
              Patient: {selectedPatientForReturn?.patient_name} ({selectedPatientForReturn?.token_number.split("-")[1]})
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Returning to OPD: {selectedPatientForReturn?.referred_from?.toUpperCase()}
            </Typography>
            <TextField
              margin="normal"
              fullWidth
              label="Remarks (Optional)"
              multiline
              rows={3}
              value={returnRemarks}
              onChange={(e) => setReturnRemarks(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReturnReferralDialogOpen(false)} color="primary">
              Cancel
            </Button>
            <Button
              onClick={confirmReturnFromReferral}
              color="success"
              variant="contained"
              disabled={returnLoading}
            >
              {returnLoading ? 'Returning...' : 'Confirm Return'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={endVisitDialogOpen} onClose={() => setEndVisitDialogOpen(false)}>
          <DialogTitle>End Visit</DialogTitle>
          <DialogContent>
            <Typography variant="body1" gutterBottom>
              Are you sure you want to end visit for - Patient: {selectedPatient?.name} ({selectedPatient?.token_number})
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEndVisitDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmEndVisit} variant="contained" color="error">
              End Visit
            </Button>
          </DialogActions>
        </Dialog>


      </Container>
    </Box>
  );
};

export default OPDManagement;

