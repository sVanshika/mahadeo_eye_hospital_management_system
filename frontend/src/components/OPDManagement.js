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
  const { activeOPDs, getOPDByCode } = useOPD();
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

  // Set default OPD when activeOPDs are loaded
  useEffect(() => {
    console.log('activeOPDs changed:', activeOPDs);
    console.log('selectedOpd:', selectedOpd);
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
      console.log('No selectedOpd, skipping fetchQueueData');
      return;
    }
    try {
      console.log(`Fetching queue data for OPD: ${selectedOpd}`);
      const response = await apiClient.get(`/opd/${selectedOpd}/queue`);
      setQueue(response.data);
      console.log(`\n\nQueue data:`, response.data);
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    }
  };

  const fetchStats = async () => {
    if (!selectedOpd) {
      console.log('No selectedOpd, skipping fetchStats');
      return;
    }
    try {
      console.log(`Fetching stats for OPD: ${selectedOpd}`);
      const response = await apiClient.get(`/opd/${selectedOpd}/stats`);
      setStats(response.data);
      console.log(`\n\nStats data:`, response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchReferred = async () => {
    if (!selectedOpd) {
      console.log('No selectedOpd, skipping fetchReferred');
      return;
    }
    try {
      console.log(`\n\nFetching referred patients from ${selectedOpd}`);
      console.log(`\n\nFetching referred patients to ${selectedOpd}`);
      const [fromResp, toResp] = await Promise.all([
        apiClient.get(`/patients/referred`, { params: { from_opd: selectedOpd } }),
        apiClient.get(`/patients/referred`, { params: { to_opd: selectedOpd } })
      ]);
      setReferredFromHere(fromResp.data || []);
      setReferredToHere(toResp.data || []);
    } catch (error) {
      console.error('Failed to fetch referred patients:', error);
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
    console.log(`\n\nEnding visit for patient ${patient.token_number}`);
    setSelectedPatient(patient);
    setEndVisitDialogOpen(true);
  };

  const confirmEndVisit = async () => {
    console.log(`\n\nEnding visit for patient ${selectedPatient.token_number}`);
  
    if (!selectedPatient || !selectedOpd) return;
      console.log(`\n\nPatient not here:`, selectedPatient);
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
        await apiClient.post(`/opd/${selectedOpd}/dilate-patient/${patient.patient_id}`);
        showSuccess(`Patient ${patient.token_number} marked for dilation`);
      } else if (type === 'refer') {
        const targetOpd = actionDialog.targetOpd;
        const remarks = actionDialog.remarks
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
      showError(error.response?.data?.detail || 'Action failed');
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
    console.log(diffMinutes);
    let hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    const days = Math.floor(hours / 24);
    hours = hours % 24;
    return ` ${days}d ${hours}h ${minutes}m`;
  };

  const handleReturnFromReferral = (patient) => {
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
                
                <List>
                  {queue.map((patient, index) => (
                    <React.Fragment key={patient.id}>
                      <ListItem>
                        <ListItemText
                          primary={`${patient.position}. ${patient.token_number.split("-")[1]} - ${patient.patient_name}`}
                          secondary={`Age: ${patient.age} | Waiting: ${formatWaitingTime(patient.registration_time)}`}
                        />
                        <ListItemSecondaryAction>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip
                              label={getStatusLabel(patient.status, patient.dilation_time)}
                              color={getStatusColor(patient.status)}
                              size="small"
                            />
                            
                            {patient.status !== 'dilated' && (
                              <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => handleDilatePatient(patient)}
                                  disabled={patient.status !== 'in'}
                              >
                                Dilate  
                              </Button>
                            )}
                            {patient.status === 'dilated' && (
                              <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => handleReturnDilated(patient)}
                                  disabled={patient.status !== 'dilated'}
                              >
                                End Dilation
                              </Button>
                            )}
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleReferPatient(patient)}
                                disabled={patient.status !== 'in'}
                            >
                              Refer
                            </Button>
                            {console.log(patient.is_referred)}
                            {patient.is_referred  && (
                              
                              <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => handleReturnFromReferral(patient)}
                                  color="success"
                                  tooltip="This is a referred patient. Click to send back to the original OPD."
                              >
                                Return
                              </Button>
                              
                            )}
                            

                            {/* This Dialog should ideally be placed at the root level of the component's return block,
                                not nested deeply within ListItemSecondaryAction, for proper rendering and accessibility. */}
                            <Dialog open={returnReferralDialogOpen} 
                              onClose={() => setReturnReferralDialogOpen(false)}
                              fullWidth>
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
                            
                            { (
                              <Button
                                variant='contained'
                                size="small"
                                onClick={() => handleEndVisit(patient)}
                                color="error"
                                tooltip="End Visit"
                              >
                                End Visit {/* Assuming DoneAll icon is available or will be imported */}
                              </Button>
                            )}
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < queue.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
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
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Referred TO this OPD
                  </Typography>
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
                  {activeOPDs.filter(opd => opd.opd_code !== selectedOpd).map((opd) => (
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
              <Typography variant="body2" color="text.secondary">
                Patient will be given dilation drops and wait 30-40 minutes before returning.
              </Typography>
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

