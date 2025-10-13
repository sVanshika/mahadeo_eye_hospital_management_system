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
  IconButton,
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
  Tooltip
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
import axios from 'axios';
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
      const response = await axios.get(`http://localhost:8000/api/opd/${selectedOpd}/queue`);
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
      const response = await axios.get(`http://localhost:8000/api/opd/${selectedOpd}/stats`);
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
        axios.get(`http://localhost:8000/api/patients/referred`, { params: { from_opd: selectedOpd } }),
        axios.get(`http://localhost:8000/api/patients/referred`, { params: { to_opd: selectedOpd } })
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
      const response = await axios.post(`http://localhost:8000/api/opd/${selectedOpd}/call-next`);
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
    // setActionDialog({
    //   open: true,
    //   type: 'end_visit',
    //   patient: patient,
    //   title: 'Confirm End Visit',
    //   message: `Are you sure you want to end the visit for patient ${patient.token_number} (${patient.patient_name})? This will mark their visit as completed.`,
    // });
  };

  const confirmEndVisit = async () => {
    console.log(`\n\nEnding visit for patient ${selectedPatient.token_number}`);
  
    if (!selectedPatient || !selectedOpd) return;
      console.log(`\n\nPatient not here:`, selectedPatient);
    try {
      await axios.post(`http://localhost:8000/api/patients/${selectedPatient.patient_id}/endvisit`);

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
        await axios.post(`http://localhost:8000/api/opd/${selectedOpd}/dilate-patient/${patient.patient_id}`);
        showSuccess(`Patient ${patient.token_number} marked for dilation`);
      } else if (type === 'refer') {
        const targetOpd = actionDialog.targetOpd;
        const remarks = actionDialog.remarks
        await axios.post(`http://localhost:8000/api/patients/${patient.patient_id}/refer`, {
          to_opd: targetOpd,
          remarks: remarks
        });
        showSuccess(`Patient ${patient.token_number} referred to ${targetOpd.toUpperCase()}`);
      } else if (type === 'return_dilated') {
        await axios.post(`http://localhost:8000/api/opd/${selectedOpd}/return-dilated/${patient.patient_id}`);
        showSuccess(`Patient ${patient.token_number} returned from dilation`);
      } else if (type === 'end_visit') {
        await axios.post(`http://localhost:8000/api/patients/${patient.patient_id}/endvisit`);
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
                              label={getStatusLabel(patient.status)}
                              color={getStatusColor(patient.status)}
                              size="small"
                            />
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleDilatePatient(patient)}
                                disabled={patient.status !== 'in'}
                            >
                              Dilate  
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleReferPatient(patient)}
                                disabled={patient.status !== 'in'}
                            >
                              Refer
                            </Button>
                            {/* {patient.is_dilated && (
                              <Chip
                                label="Dilated"
                                color="secondary"
                                size="small"
                              />
                            )}
                            {patient.status === 'pending' && (
                              <IconButton
                                size="small"
                                onClick={() => handleDilatePatient(patient)}
                                color="secondary"
                              >
                                <Schedule />
                              </IconButton>
                            )}
                            {patient.status === 'dilated' && (
                              <IconButton
                                size="small"
                                onClick={() => handleReturnDilated(patient)}
                                color="primary"
                              >
                                <CheckCircle />
                              </IconButton>
                            )}
                            {patient.status === 'in' && (
                              <IconButton
                                size="small"
                                onClick={() => handleReferPatient(patient)}
                                color="error"
                              >
                                <PersonAdd />
                              </IconButton>
                            )} */}
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
                              label={getStatusLabel(p.status)}
                              color={getStatusColor(p.status)}
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
                              label={getStatusLabel(p.status)}
                              color={getStatusColor(p.status)}
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

