import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Paper,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import {
  PersonAdd,
  LocalHospital,
  AdminPanelSettings,
  Visibility,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from './Navbar';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/admin/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const getQuickActions = () => {
    const actions = [];

    if (user.role === 'admin' || user.role === 'registration') {
      actions.push({
        title: 'Patient Registration',
        description: 'Register new patients and generate tokens',
        icon: <PersonAdd />,
        color: 'primary',
        onClick: () => navigate('/registration'),
      });
    }

    if (user.role === 'admin' || user.role === 'nursing') {
      actions.push({
        title: 'OPD Management',
        description: 'Manage patient queues and OPD operations',
        icon: <LocalHospital />,
        color: 'secondary',
        onClick: () => navigate('/opd'),
      });
    }

    if (user.role === 'admin') {
      actions.push({
        title: 'Admin Panel',
        description: 'Manage users, rooms, and view reports',
        icon: <AdminPanelSettings />,
        color: 'success',
        onClick: () => navigate('/admin'),
      });
    }

    actions.push({
      title: 'Display Screens',
      description: 'View real-time queue displays',
      icon: <Visibility />,
      color: 'info',
      onClick: () => navigate('/display'),
    });

    return actions;
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Navbar onRefresh={fetchStats} pageTitle="Dashboard" />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          {/* Quick Actions */}
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              {getQuickActions().map((action, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      '&:hover': {
                        boxShadow: 6,
                      },
                    }}
                    onClick={action.onClick}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: 1,
                            bgcolor: `${action.color}.light`,
                            color: `${action.color}.contrastText`,
                            mr: 2,
                          }}
                        >
                          {action.icon}
                        </Box>
                        <Typography variant="h6" component="h2">
                          {action.title}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {action.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Statistics */}
          {stats && (
            <Grid item xs={12}>
              <Typography variant="h5" gutterBottom>
                Today's Statistics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {stats.total_patients_today}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Patients Today
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main">
                      {stats.total_patients_pending}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main">
                      {stats.total_patients_in_opd}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      In OPD
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {stats.total_patients_completed}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Completed
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>
          )}

          {/* OPD Statistics */}
          {stats && stats.opd_stats && (
            <Grid item xs={12}>
              <Typography variant="h5" gutterBottom>
                OPD Statistics
              </Typography>
              <Grid container spacing={2}>
                {stats.opd_stats.map((opd, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="h6" gutterBottom>
                        {opd.opd_type.toUpperCase()}
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText
                            primary="Total Patients"
                            secondary={opd.total_patients}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Pending"
                            secondary={opd.pending}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="In Progress"
                            secondary={opd.in_progress}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Completed Today"
                            secondary={opd.completed_today}
                          />
                        </ListItem>
                      </List>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          )}
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;

