import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Typography as MuiTypography,
  Typography,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  CheckCircle,
  PersonAdd,
  Room,
  Assessment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOPD } from '../contexts/OPDContext';
import apiClient from '../apiClient';
import Navbar from './Navbar';

const AdminPanel = () => {
  const { opds, createOPD, updateOPD, deleteOPD, activateOPD } = useOPD();
  const [tabValue, setTabValue] = useState(0);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [patientFlows, setPatientFlows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchDashboardStats();
    if (tabValue === 0) fetchUsers();
    if (tabValue === 1) ; // OPDs are managed by context
    if (tabValue === 2) fetchRooms();
    if (tabValue === 3) fetchPatientFlows();
  }, [tabValue]);

  const fetchDashboardStats = async () => {
    try {
      const response = await apiClient.get('/admin/dashboard');
      setDashboardStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/admin/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await apiClient.get('/admin/rooms');
      setRooms(response.data);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  const fetchPatientFlows = async () => {
    try {
      const response = await apiClient.get('/admin/patient-flows');
      setPatientFlows(response.data);
    } catch (error) {
      console.error('Failed to fetch patient flows:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleOpenDialog = (type, item = null) => {
    setDialogType(type);
    setSelectedItem(item);
    setFormData(item || {});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setDialogType('');
    setSelectedItem(null);
    setFormData({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (dialogType === 'user') {
        if (selectedItem) {
          // Update user
          await apiClient.put(`/admin/users/${selectedItem.id}`, formData);
          setSuccess('User updated successfully');
        } else {
          // Create user
          await apiClient.post('/admin/users', formData);
          setSuccess('User created successfully');
        }
        fetchUsers();
      } else if (dialogType === 'room') {
        if (selectedItem) {
          // Update room
          await apiClient.put(`/admin/rooms/${selectedItem.id}`, formData);
          setSuccess('Room updated successfully');
        } else {
          // Create room
          await apiClient.post('/admin/rooms', formData);
          setSuccess('Room created successfully');
        }
        fetchRooms();
      } else if (dialogType === 'opd') {
        if (selectedItem) {
          // Update OPD
          const result = await updateOPD(selectedItem.id, formData);
          if (result.success) {
            setSuccess('OPD updated successfully');
          } else {
            setError(result.error);
            return;
          }
        } else {
          // Create OPD
          const result = await createOPD(formData);
          if (result.success) {
            setSuccess('OPD created successfully');
          } else {
            setError(result.error);
            return;
          }
        }
      }
      handleCloseDialog();
    } catch (error) {
      setError(error.response?.data?.detail || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role) => {
    const roleColors = {
      admin: 'error',
      registration: 'primary',
      nursing: 'secondary',
    };
    return roleColors[role] || 'default';
  };

  const getStatusColor = (status) => {
    const statusColors = {
      pending: 'warning',
      in: 'info',
      dilated: 'secondary',
      referred: 'error',
      end_visit: 'success',
    };
    return statusColors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const statusLabels = {
      pending: 'Pending',
      in: 'In OPD',
      dilated: 'Dilated',
      referred: 'Referred',
      end_visit: 'Completed',
    };
    return statusLabels[status] || status;
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Navbar 
        onRefresh={() => {
          fetchDashboardStats();
          if (tabValue === 0) fetchUsers();
          if (tabValue === 1) fetchRooms();
          if (tabValue === 2) fetchPatientFlows();
        }} 
        pageTitle="Admin Panel"
      />

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Dashboard Stats */}
        {dashboardStats && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <MuiTypography variant="h4" color="primary">
                    {dashboardStats.total_patients_today}
                  </MuiTypography>
                  <MuiTypography variant="body2" color="text.secondary">
                    Total Patients Today
                  </MuiTypography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <MuiTypography variant="h4" color="warning.main">
                    {dashboardStats.total_patients_pending}
                  </MuiTypography>
                  <MuiTypography variant="body2" color="text.secondary">
                    Pending
                  </MuiTypography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <MuiTypography variant="h4" color="info.main">
                    {dashboardStats.total_patients_in_opd}
                  </MuiTypography>
                  <MuiTypography variant="body2" color="text.secondary">
                    In OPD
                  </MuiTypography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <MuiTypography variant="h4" color="success.main">
                    {dashboardStats.total_patients_completed}
                  </MuiTypography>
                  <MuiTypography variant="body2" color="text.secondary">
                    Completed
                  </MuiTypography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Tabs */}
        <Paper sx={{ width: '100%' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="admin tabs">
            <Tab label="Users" icon={<PersonAdd />} />
            <Tab label="OPDs" icon={<Room />} />
            <Tab label="Rooms" icon={<Room />} />
            <Tab label="Patient Flows" icon={<Assessment />} />
          </Tabs>

          {/* Users Tab */}
          {tabValue === 0 && (
            <Box sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">User Management</Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleOpenDialog('user')}
                >
                  Add User
                </Button>
              </Box>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Username</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={user.role}
                            color={getRoleColor(user.role)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.is_active ? 'Active' : 'Inactive'}
                            color={user.is_active ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog('user', user)}
                          >
                            <Edit />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* OPDs Tab */}
          {tabValue === 1 && (
            <Box sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">OPD Management</Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleOpenDialog('opd')}
                >
                  Add OPD
                </Button>
              </Box>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>OPD Code</TableCell>
                      <TableCell>OPD Name</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {opds.map((opd) => (
                      <TableRow key={opd.id}>
                        <TableCell>{opd.opd_code}</TableCell>
                        <TableCell>{opd.opd_name}</TableCell>
                        <TableCell>{opd.description || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={opd.is_active ? 'Active' : 'Inactive'}
                            color={opd.is_active ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog('opd', opd)}
                          >
                            <Edit />
                          </IconButton>
                          {opd.is_active ? (
                            <IconButton
                              size="small"
                              onClick={() => deleteOPD(opd.id)}
                              color="error"
                            >
                              <Delete />
                            </IconButton>
                          ) : (
                            <IconButton
                              size="small"
                              onClick={() => activateOPD(opd.id)}
                              color="success"
                            >
                              <CheckCircle />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Rooms Tab */}
          {tabValue === 2 && (
            <Box sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Room Management</Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleOpenDialog('room')}
                >
                  Add Room
                </Button>
              </Box>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Room Number</TableCell>
                      <TableCell>Room Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell>{room.room_number}</TableCell>
                        <TableCell>{room.room_name}</TableCell>
                        <TableCell>{room.room_type}</TableCell>
                        <TableCell>
                          <Chip
                            label={room.is_active ? 'Active' : 'Inactive'}
                            color={room.is_active ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog('room', room)}
                          >
                            <Edit />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Patient Flows Tab */}
          {tabValue === 3 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Patient Flow History
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Token</TableCell>
                      <TableCell>Patient</TableCell>
                      <TableCell>From Room</TableCell>
                      <TableCell>To Room</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Time</TableCell>
                      <TableCell>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {patientFlows.map((flow) => (
                      <TableRow key={flow.id}>
                        <TableCell>{flow.patient_id}</TableCell>
                        <TableCell>{flow.token_number}</TableCell>
                        <TableCell>{flow.patient_name}</TableCell>
                        <TableCell>{flow.from_room || '-'}</TableCell>
                        <TableCell>{flow.to_room || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(flow.status)}
                            color={getStatusColor(flow.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(flow.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>{flow.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Paper>

        {/* Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {dialogType === 'user' && (selectedItem ? 'Edit User' : 'Add User')}
            {dialogType === 'opd' && (selectedItem ? 'Edit OPD' : 'Add OPD')}
            {dialogType === 'room' && (selectedItem ? 'Edit Room' : 'Add Room')}
          </DialogTitle>
          <DialogContent>
            {dialogType === 'user' && (
              <>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="Username"
                  name="username"
                  value={formData.username || ''}
                  onChange={handleInputChange}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={handleInputChange}
                />
                <TextField
                  margin="normal"
                  fullWidth
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password || ''}
                  onChange={handleInputChange}
                />
                <FormControl fullWidth margin="normal">
                  <InputLabel>Role</InputLabel>
                  <Select
                    name="role"
                    value={formData.role || ''}
                    onChange={handleInputChange}
                    label="Role"
                  >
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="registration">Registration</MenuItem>
                    <MenuItem value="nursing">Nursing</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}
            {dialogType === 'opd' && (
              <>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="OPD Code"
                  name="opd_code"
                  value={formData.opd_code || ''}
                  onChange={handleInputChange}
                  disabled={!!selectedItem} // Disable editing OPD code for existing OPDs
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="OPD Name"
                  name="opd_name"
                  value={formData.opd_name || ''}
                  onChange={handleInputChange}
                />
                <TextField
                  margin="normal"
                  fullWidth
                  label="Description"
                  name="description"
                  multiline
                  rows={3}
                  value={formData.description || ''}
                  onChange={handleInputChange}
                />
                {selectedItem && (
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Status</InputLabel>
                    <Select
                      name="is_active"
                      value={formData.is_active !== undefined ? formData.is_active : true}
                      onChange={handleInputChange}
                      label="Status"
                    >
                      <MenuItem value={true}>Active</MenuItem>
                      <MenuItem value={false}>Inactive</MenuItem>
                    </Select>
                  </FormControl>
                )}
              </>
            )}
            {dialogType === 'room' && (
              <>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="Room Number"
                  name="room_number"
                  value={formData.room_number || ''}
                  onChange={handleInputChange}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="Room Name"
                  name="room_name"
                  value={formData.room_name || ''}
                  onChange={handleInputChange}
                />
                <FormControl fullWidth margin="normal">
                  <InputLabel>Room Type</InputLabel>
                  <Select
                    name="room_type"
                    value={formData.room_type || ''}
                    onChange={handleInputChange}
                    label="Room Type"
                  >
                    <MenuItem value="vision">Vision Room</MenuItem>
                    <MenuItem value="opd">OPD</MenuItem>
                    <MenuItem value="refraction">Refraction</MenuItem>
                    <MenuItem value="retina">Retina Lab</MenuItem>
                    <MenuItem value="biometry">Biometry</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default AdminPanel;

