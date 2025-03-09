// src/pages/Playbooks.jsx
import localforage from 'localforage';
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemText, 
  Divider, 
  Button, 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  CircularProgress,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  ViewModule as CardViewIcon,
  ViewList as TableViewIcon
} from '@mui/icons-material';
import { executeQuery, executeNonQuery, getLastInsertId } from '../services/database/db';
import { ensureArray, safeMap } from '../utils/arrayUtils';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`playbook-tabpanel-${index}`}
      aria-labelledby={`playbook-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Playbooks = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [instruments, setInstruments] = useState([]);
  const [playbooks, setPlaybooks] = useState([]);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState(null);
  const [selectedPlaybook, setSelectedPlaybook] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('new'); // 'new', 'edit'
  const [playbookName, setPlaybookName] = useState('');
  const [dialogError, setDialogError] = useState('');
  
  // Playbook form fields
  const [formData, setFormData] = useState({
    day: 'Mon',
    direction: 'Long',
    confirmation_time: '',
    mode_time_start: '',
    mode_time_end: '',
    time_cl_1_start: '',
    time_cl_1_end: '',
    ret_median_time: '',
    dropoff_time: '',
    ret_cluster_1_start: 0,
    ret_cluster_1_end: 0,
    ret_cluster_2_start: 0,
    ret_cluster_2_end: 0,
    ret_cluster_3_start: 0,
    ret_cluster_3_end: 0,
    ext_median_time: '',
    ext_cluster_1_start: 0,
    ext_cluster_1_end: 0,
    ext_cluster_2_start: 0,
    ext_cluster_2_end: 0,
  });
  
  // View mode
  const [viewMode, setViewMode] = useState('card'); // 'card', 'table'
  
  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [playbookToDelete, setPlaybookToDelete] = useState(null);
  
  useEffect(() => {
    fetchInstruments();
  }, []);
  
  useEffect(() => {
    if (selectedInstrumentId) {
      fetchPlaybooks(selectedInstrumentId);
    }
  }, [selectedInstrumentId]);
  
  const fetchInstruments = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching instruments for Playbooks...");
      
      // Direct access to instruments store for more reliable data retrieval
      const instrumentsStore = localforage.createInstance({ name: 'instruments' });
      const instrumentsList = [];
      
      // Get all instruments
      await instrumentsStore.iterate((value) => {
        instrumentsList.push(value);
      });
      
      console.log(`Retrieved ${instrumentsList.length} instruments:`, instrumentsList);
      
      if (instrumentsList.length === 0) {
        // If no instruments are found, try to seed default data
        console.warn("No instruments found, attempting to seed default data...");
        await seedDefaultInstruments();
        
        // Try fetching again
        await instrumentsStore.iterate((value) => {
          instrumentsList.push(value);
        });
        
        console.log(`After seeding, retrieved ${instrumentsList.length} instruments`);
      }
      
      // Set the instruments state
      setInstruments(instrumentsList);
      
      // Select first instrument by default if available
      if (instrumentsList.length > 0) {
        setSelectedInstrumentId(instrumentsList[0].id);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching instruments:', err);
      setError(err);
      setIsLoading(false);
    }
  };
  
  // Helper function to seed default instruments if none exist
  const seedDefaultInstruments = async () => {
    try {
      const instrumentsStore = localforage.createInstance({ name: 'instruments' });
      
      // Default instruments from defaultData.js
      const defaultInstruments = [
        { name: 'ES (E-mini S&P 500)', tickValue: 12.5, color: '#4CAF50' },
        { name: 'NQ (E-mini Nasdaq-100)', tickValue: 5.0, color: '#2196F3' }
      ];
      
      // Insert default instruments
      for (let i = 0; i < defaultInstruments.length; i++) {
        const id = i + 1;
        await instrumentsStore.setItem(id.toString(), { 
          id, 
          ...defaultInstruments[i] 
        });
      }
      
      console.log("Successfully seeded default instruments");
      return true;
    } catch (error) {
      console.error("Error seeding default instruments:", error);
      return false;
    }
  };
  
  const fetchPlaybooks = async (instrumentId) => {
    try {
      setIsLoading(true);
      
      // Fetch playbooks for the selected instrument
      const playbooksResult = executeQuery(`
        SELECT * FROM playbooks
        WHERE instrument_id = ?
        ORDER BY day, direction, confirmation_time
      `, [instrumentId]);
      
      setPlaybooks(playbooksResult);
      
      // Clear selected playbook
      setSelectedPlaybook(null);
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching playbooks:', err);
      setError(err);
      setIsLoading(false);
    }
  };
  
  const handleInstrumentSelect = (instrumentId) => {
    setSelectedInstrumentId(instrumentId);
  };
  
  const handlePlaybookSelect = (playbook) => {
    setSelectedPlaybook(playbook);
  };
  
  const handleAddPlaybook = () => {
    setDialogMode('new');
    setPlaybookName('');
    resetFormData();
    setDialogError('');
    setDialogOpen(true);
  };
  
  const handleEditPlaybook = () => {
    if (!selectedPlaybook) return;
    
    setDialogMode('edit');
    setPlaybookName(selectedPlaybook.name);
    setFormData({
      day: selectedPlaybook.day,
      direction: selectedPlaybook.direction,
      confirmation_time: selectedPlaybook.confirmation_time,
      mode_time_start: selectedPlaybook.mode_time_start || '',
      mode_time_end: selectedPlaybook.mode_time_end || '',
      time_cl_1_start: selectedPlaybook.time_cl_1_start || '',
      time_cl_1_end: selectedPlaybook.time_cl_1_end || '',
      ret_median_time: selectedPlaybook.ret_median_time || '',
      dropoff_time: selectedPlaybook.dropoff_time || '',
      ret_cluster_1_start: selectedPlaybook.ret_cluster_1_start || 0,
      ret_cluster_1_end: selectedPlaybook.ret_cluster_1_end || 0,
      ret_cluster_2_start: selectedPlaybook.ret_cluster_2_start || 0,
      ret_cluster_2_end: selectedPlaybook.ret_cluster_2_end || 0,
      ret_cluster_3_start: selectedPlaybook.ret_cluster_3_start || 0,
      ret_cluster_3_end: selectedPlaybook.ret_cluster_3_end || 0,
      ext_median_time: selectedPlaybook.ext_median_time || '',
      ext_cluster_1_start: selectedPlaybook.ext_cluster_1_start || 0,
      ext_cluster_1_end: selectedPlaybook.ext_cluster_1_end || 0,
      ext_cluster_2_start: selectedPlaybook.ext_cluster_2_start || 0,
      ext_cluster_2_end: selectedPlaybook.ext_cluster_2_end || 0,
    });
    setDialogError('');
    setDialogOpen(true);
  };
  
  const handleDeleteClick = (playbook) => {
    setPlaybookToDelete(playbook);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = () => {
    if (!playbookToDelete) return;
    
    try {
      executeNonQuery(`
        DELETE FROM playbooks WHERE id = ?
      `, [playbookToDelete.id]);
      
      fetchPlaybooks(selectedInstrumentId);
      
      if (selectedPlaybook && selectedPlaybook.id === playbookToDelete.id) {
        setSelectedPlaybook(null);
      }
    } catch (error) {
      console.error('Error deleting playbook:', error);
    }
    
    setDeleteDialogOpen(false);
    setPlaybookToDelete(null);
  };
  
  const handleDialogClose = () => {
    setDialogOpen(false);
  };
  
  const resetFormData = () => {
    setFormData({
      day: 'Mon',
      direction: 'Long',
      confirmation_time: '',
      mode_time_start: '',
      mode_time_end: '',
      time_cl_1_start: '',
      time_cl_1_end: '',
      ret_median_time: '',
      dropoff_time: '',
      ret_cluster_1_start: 0,
      ret_cluster_1_end: 0,
      ret_cluster_2_start: 0,
      ret_cluster_2_end: 0,
      ret_cluster_3_start: 0,
      ret_cluster_3_end: 0,
      ext_median_time: '',
      ext_cluster_1_start: 0,
      ext_cluster_1_end: 0,
      ext_cluster_2_start: 0,
      ext_cluster_2_end: 0,
    });
  };
  
  const handleFormChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };
  
  const handleSavePlaybook = () => {
    if (!playbookName.trim()) {
      setDialogError('Playbook name is required');
      return;
    }
    
    if (!formData.confirmation_time) {
      setDialogError('Confirmation time is required');
      return;
    }
    
    try {
      if (dialogMode === 'new') {
        // Create new playbook
        executeNonQuery(`
          INSERT INTO playbooks (
            instrument_id, name, day, direction, confirmation_time,
            mode_time_start, mode_time_end, time_cl_1_start, time_cl_1_end,
            ret_median_time, dropoff_time, 
            ret_cluster_1_start, ret_cluster_1_end,
            ret_cluster_2_start, ret_cluster_2_end,
            ret_cluster_3_start, ret_cluster_3_end,
            ext_median_time,
            ext_cluster_1_start, ext_cluster_1_end,
            ext_cluster_2_start, ext_cluster_2_end
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          selectedInstrumentId,
          playbookName.trim(),
          formData.day,
          formData.direction,
          formData.confirmation_time,
          formData.mode_time_start,
          formData.mode_time_end,
          formData.time_cl_1_start,
          formData.time_cl_1_end,
          formData.ret_median_time,
          formData.dropoff_time,
          formData.ret_cluster_1_start,
          formData.ret_cluster_1_end,
          formData.ret_cluster_2_start,
          formData.ret_cluster_2_end,
          formData.ret_cluster_3_start,
          formData.ret_cluster_3_end,
          formData.ext_median_time,
          formData.ext_cluster_1_start,
          formData.ext_cluster_1_end,
          formData.ext_cluster_2_start,
          formData.ext_cluster_2_end
        ]);
        
        // Get the new playbook ID
        const newPlaybookId = getLastInsertId();
        
        // Fetch playbooks again
        fetchPlaybooks(selectedInstrumentId);
      } else {
        // Update existing playbook
        executeNonQuery(`
          UPDATE playbooks SET
            name = ?, day = ?, direction = ?, confirmation_time = ?,
            mode_time_start = ?, mode_time_end = ?, 
            time_cl_1_start = ?, time_cl_1_end = ?,
            ret_median_time = ?, dropoff_time = ?, 
            ret_cluster_1_start = ?, ret_cluster_1_end = ?,
            ret_cluster_2_start = ?, ret_cluster_2_end = ?,
            ret_cluster_3_start = ?, ret_cluster_3_end = ?,
            ext_median_time = ?,
            ext_cluster_1_start = ?, ext_cluster_1_end = ?,
            ext_cluster_2_start = ?, ext_cluster_2_end = ?
          WHERE id = ?
        `, [
          playbookName.trim(),
          formData.day,
          formData.direction,
          formData.confirmation_time,
          formData.mode_time_start,
          formData.mode_time_end,
          formData.time_cl_1_start,
          formData.time_cl_1_end,
          formData.ret_median_time,
          formData.dropoff_time,
          formData.ret_cluster_1_start,
          formData.ret_cluster_1_end,
          formData.ret_cluster_2_start,
          formData.ret_cluster_2_end,
          formData.ret_cluster_3_start,
          formData.ret_cluster_3_end,
          formData.ext_median_time,
          formData.ext_cluster_1_start,
          formData.ext_cluster_1_end,
          formData.ext_cluster_2_start,
          formData.ext_cluster_2_end,
          selectedPlaybook.id
        ]);
        
        // Fetch playbooks again
        fetchPlaybooks(selectedInstrumentId);
      }
      
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving playbook:', error);
      setDialogError('Failed to save playbook. Please try again.');
    }
  };
  
  const toggleViewMode = () => {
    setViewMode(viewMode === 'card' ? 'table' : 'card');
  };
  
  // Generate confirmation time options
  const getConfirmationTimeOptions = () => {
    const timeOptions = [];
    
    // ODR: 4:00-8:25
    for (let hour = 4; hour <= 8; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        if (hour === 8 && minute > 25) break;
        
        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');
        timeOptions.push(`${formattedHour}:${formattedMinute}`);
      }
    }
    
    // RDR: 10:30-15:55
    for (let hour = 10; hour <= 15; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        if (hour === 10 && minute < 30) continue;
        if (hour === 15 && minute > 55) break;
        
        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');
        timeOptions.push(`${formattedHour}:${formattedMinute}`);
      }
    }
    
    return timeOptions;
  };
  
  const timeOptions = getConfirmationTimeOptions();
  
  // Find selected instrument name
  const selectedInstrumentName = Array.isArray(instruments) && instruments.length > 0 
    ? instruments.find(i => i.id === selectedInstrumentId)?.name || '' 
    : '';
  
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box p={3}>
        <Typography color="error" variant="h6">
          Error: {error.message}
        </Typography>
      </Box>
    );
  }
  
  if (instruments.length === 0) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Playbooks
        </Typography>
        <Card>
          <CardContent>
            <Typography variant="h6" align="center">
              No instruments found
            </Typography>
            <Typography variant="body1" align="center" color="text.secondary">
              Please add instruments in the Settings section first.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Playbooks
      </Typography>
      
      <Grid container spacing={3}>
        {/* Left column - Instrument and Playbook Selection */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Instruments
              </Typography>
              
              <List>
                {ensureArray(instruments).map((instrument) => (
                  <ListItem key={instrument.id} disablePadding>
                    <ListItemButton
                      selected={selectedInstrumentId === instrument.id}
                      onClick={() => handleInstrumentSelect(instrument.id)}
                    >
                      <ListItemText primary={instrument.name} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent sx={{ pb: 1 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6">
                  Playbooks
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleAddPlaybook}
                  disabled={!selectedInstrumentId}
                >
                  New Playbook
                </Button>
              </Box>
              
              {playbooks.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ my: 3 }}>
                  No playbooks found for this instrument.
                </Typography>
              ) : (
                <List>
                  {ensureArray(playbooks).map((playbook) => (
                    <ListItem
                      key={playbook.id}
                      secondaryAction={
                        <IconButton 
                          edge="end" 
                          aria-label="delete"
                          onClick={() => handleDeleteClick(playbook)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                      disablePadding
                    >
                      <ListItemButton
                        selected={selectedPlaybook && selectedPlaybook.id === playbook.id}
                        onClick={() => handlePlaybookSelect(playbook)}
                      >
                        <ListItemText 
                          primary={playbook.name} 
                          secondary={`${playbook.day} - ${playbook.direction} - ${playbook.confirmation_time}`} 
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Right column - Playbook Details */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  {selectedPlaybook ? `${selectedPlaybook.name}` : 'Playbook Details'}
                </Typography>
                <Box>
                  <IconButton onClick={toggleViewMode}>
                    {viewMode === 'card' ? <TableViewIcon /> : <CardViewIcon />}
                  </IconButton>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<EditIcon />}
                    onClick={handleEditPlaybook}
                    disabled={!selectedPlaybook}
                    sx={{ ml: 1 }}
                  >
                    Edit
                  </Button>
                </Box>
              </Box>
              
              {!selectedPlaybook ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ my: 4 }}>
                  Select a playbook to view details.
                </Typography>
              ) : (
                viewMode === 'card' ? (
                  <Grid container spacing={3}>
                    {/* Basic Info */}
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" gutterBottom>
                        Instrument: {selectedInstrumentName}
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                        <Typography variant="body2" color="text.secondary">
                          Day: {selectedPlaybook.day}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Direction: {selectedPlaybook.direction}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Confirmation Time: {selectedPlaybook.confirmation_time}
                        </Typography>
                      </Box>
                      <Divider sx={{ mb: 2 }} />
                    </Grid>
                    
                    {/* Time Information */}
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        Time Information
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText 
                            primary="Mode Time" 
                            secondary={`${selectedPlaybook.mode_time_start || 'N/A'} - ${selectedPlaybook.mode_time_end || 'N/A'}`} 
                          />
                        </ListItem>
                        <Divider component="li" />
                        <ListItem>
                          <ListItemText 
                            primary="Time Cluster 1" 
                            secondary={`${selectedPlaybook.time_cl_1_start || 'N/A'} - ${selectedPlaybook.time_cl_1_end || 'N/A'}`} 
                          />
                        </ListItem>
                        <Divider component="li" />
                        <ListItem>
                          <ListItemText 
                            primary="Retracement Median Time" 
                            secondary={selectedPlaybook.ret_median_time || 'N/A'} 
                          />
                        </ListItem>
                        <Divider component="li" />
                        <ListItem>
                          <ListItemText 
                            primary="Dropoff Time" 
                            secondary={selectedPlaybook.dropoff_time || 'N/A'} 
                          />
                        </ListItem>
                        <Divider component="li" />
                        <ListItem>
                          <ListItemText 
                            primary="Extension Median Time" 
                            secondary={selectedPlaybook.ext_median_time || 'N/A'} 
                          />
                        </ListItem>
                      </List>
                    </Grid>
                    
                    {/* Retracement and Extension Clusters */}
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        Retracement & Extension Clusters
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText 
                            primary="Retracement Cluster 1" 
                            secondary={`${selectedPlaybook.ret_cluster_1_start?.toFixed(1) || 'N/A'} - ${selectedPlaybook.ret_cluster_1_end?.toFixed(1) || 'N/A'}`} 
                          />
                        </ListItem>
                        <Divider component="li" />
                        <ListItem>
                          <ListItemText 
                            primary="Retracement Cluster 2" 
                            secondary={`${selectedPlaybook.ret_cluster_2_start?.toFixed(1) || 'N/A'} - ${selectedPlaybook.ret_cluster_2_end?.toFixed(1) || 'N/A'}`} 
                          />
                        </ListItem>
                        <Divider component="li" />
                        <ListItem>
                          <ListItemText 
                            primary="Retracement Cluster 3" 
                            secondary={`${selectedPlaybook.ret_cluster_3_start?.toFixed(1) || 'N/A'} - ${selectedPlaybook.ret_cluster_3_end?.toFixed(1) || 'N/A'}`} 
                          />
                        </ListItem>
                        <Divider component="li" />
                        <ListItem>
                          <ListItemText 
                            primary="Extension Cluster 1" 
                            secondary={`${selectedPlaybook.ext_cluster_1_start?.toFixed(1) || 'N/A'} - ${selectedPlaybook.ext_cluster_1_end?.toFixed(1) || 'N/A'}`} 
                          />
                        </ListItem>
                        <Divider component="li" />
                        <ListItem>
                          <ListItemText 
                            primary="Extension Cluster 2" 
                            secondary={`${selectedPlaybook.ext_cluster_2_start?.toFixed(1) || 'N/A'} - ${selectedPlaybook.ext_cluster_2_end?.toFixed(1) || 'N/A'}`} 
                          />
                        </ListItem>
                      </List>
                    </Grid>
                  </Grid>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Field</TableCell>
                          <TableCell>Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>Day</TableCell>
                          <TableCell>{selectedPlaybook.day}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Direction</TableCell>
                          <TableCell>{selectedPlaybook.direction}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Confirmation Time</TableCell>
                          <TableCell>{selectedPlaybook.confirmation_time}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Mode Time Start</TableCell>
                          <TableCell>{selectedPlaybook.mode_time_start || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Mode Time End</TableCell>
                          <TableCell>{selectedPlaybook.mode_time_end || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Time Cluster 1 Start</TableCell>
                          <TableCell>{selectedPlaybook.time_cl_1_start || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Time Cluster 1 End</TableCell>
                          <TableCell>{selectedPlaybook.time_cl_1_end || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Ret. Median Time</TableCell>
                          <TableCell>{selectedPlaybook.ret_median_time || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Dropoff Time</TableCell>
                          <TableCell>{selectedPlaybook.dropoff_time || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Ret. Cluster 1 Start</TableCell>
                          <TableCell>{selectedPlaybook.ret_cluster_1_start?.toFixed(1) || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Ret. Cluster 1 End</TableCell>
                          <TableCell>{selectedPlaybook.ret_cluster_1_end?.toFixed(1) || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Ret. Cluster 2 Start</TableCell>
                          <TableCell>{selectedPlaybook.ret_cluster_2_start?.toFixed(1) || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Ret. Cluster 2 End</TableCell>
                          <TableCell>{selectedPlaybook.ret_cluster_2_end?.toFixed(1) || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Ret. Cluster 3 Start</TableCell>
                          <TableCell>{selectedPlaybook.ret_cluster_3_start?.toFixed(1) || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Ret. Cluster 3 End</TableCell>
                          <TableCell>{selectedPlaybook.ret_cluster_3_end?.toFixed(1) || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Ext. Median Time</TableCell>
                          <TableCell>{selectedPlaybook.ext_median_time || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Ext. Cluster 1 Start</TableCell>
                          <TableCell>{selectedPlaybook.ext_cluster_1_start?.toFixed(1) || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Ext. Cluster 1 End</TableCell>
                          <TableCell>{selectedPlaybook.ext_cluster_1_end?.toFixed(1) || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Ext. Cluster 2 Start</TableCell>
                          <TableCell>{selectedPlaybook.ext_cluster_2_start?.toFixed(1) || 'N/A'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Ext. Cluster 2 End</TableCell>
                          <TableCell>{selectedPlaybook.ext_cluster_2_end?.toFixed(1) || 'N/A'}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                )
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Playbook Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>{dialogMode === 'new' ? 'New Playbook' : 'Edit Playbook'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Playbook Name"
              value={playbookName}
              onChange={(e) => setPlaybookName(e.target.value)}
              error={!!dialogError}
              helperText={dialogError}
              margin="normal"
            />
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Basic Info */}
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel id="day-label">Day</InputLabel>
                  <Select
                    labelId="day-label"
                    value={formData.day}
                    label="Day"
                    onChange={(e) => handleFormChange('day', e.target.value)}
                  >
                    <MenuItem value="Mon">Monday</MenuItem>
                    <MenuItem value="Tue">Tuesday</MenuItem>
                    <MenuItem value="Wed">Wednesday</MenuItem>
                    <MenuItem value="Thu">Thursday</MenuItem>
                    <MenuItem value="Fri">Friday</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel id="direction-label">Direction</InputLabel>
                  <Select
                    labelId="direction-label"
                    value={formData.direction}
                    label="Direction"
                    onChange={(e) => handleFormChange('direction', e.target.value)}
                  >
                    <MenuItem value="Long">Long</MenuItem>
                    <MenuItem value="Short">Short</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel id="confirmation-time-label">Confirmation Time</InputLabel>
                  <Select
                    labelId="confirmation-time-label"
                    value={formData.confirmation_time}
                    label="Confirmation Time"
                    onChange={(e) => handleFormChange('confirmation_time', e.target.value)}
                  >
                    {ensureArray(timeOptions).map((time) => (
                      <MenuItem key={time} value={time}>{time}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Time Information */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Time Information
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Mode Time Start"
                  value={formData.mode_time_start}
                  onChange={(e) => handleFormChange('mode_time_start', e.target.value)}
                  placeholder="HH:MM"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Mode Time End"
                  value={formData.mode_time_end}
                  onChange={(e) => handleFormChange('mode_time_end', e.target.value)}
                  placeholder="HH:MM"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Time Cluster 1 Start"
                  value={formData.time_cl_1_start}
                  onChange={(e) => handleFormChange('time_cl_1_start', e.target.value)}
                  placeholder="HH:MM"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Time Cluster 1 End"
                  value={formData.time_cl_1_end}
                  onChange={(e) => handleFormChange('time_cl_1_end', e.target.value)}
                  placeholder="HH:MM"
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Ret. Median Time"
                  value={formData.ret_median_time}
                  onChange={(e) => handleFormChange('ret_median_time', e.target.value)}
                  placeholder="HH:MM"
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Dropoff Time"
                  value={formData.dropoff_time}
                  onChange={(e) => handleFormChange('dropoff_time', e.target.value)}
                  placeholder="HH:MM"
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Ext. Median Time"
                  value={formData.ext_median_time}
                  onChange={(e) => handleFormChange('ext_median_time', e.target.value)}
                  placeholder="HH:MM"
                />
              </Grid>
              
              {/* Retracement Clusters */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Retracement Clusters
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ret. Cluster 1 Start"
                  type="number"
                  value={formData.ret_cluster_1_start}
                  onChange={(e) => handleFormChange('ret_cluster_1_start', parseFloat(e.target.value))}
                  inputProps={{ step: 0.1, min: -1.5, max: 3.5 }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ret. Cluster 1 End"
                  type="number"
                  value={formData.ret_cluster_1_end}
                  onChange={(e) => handleFormChange('ret_cluster_1_end', parseFloat(e.target.value))}
                  inputProps={{ step: 0.1, min: -1.5, max: 3.5 }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ret. Cluster 2 Start"
                  type="number"
                  value={formData.ret_cluster_2_start}
                  onChange={(e) => handleFormChange('ret_cluster_2_start', parseFloat(e.target.value))}
                  inputProps={{ step: 0.1, min: -1.5, max: 3.5 }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ret. Cluster 2 End"
                  type="number"
                  value={formData.ret_cluster_2_end}
                  onChange={(e) => handleFormChange('ret_cluster_2_end', parseFloat(e.target.value))}
                  inputProps={{ step: 0.1, min: -1.5, max: 3.5 }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ret. Cluster 3 Start"
                  type="number"
                  value={formData.ret_cluster_3_start}
                  onChange={(e) => handleFormChange('ret_cluster_3_start', parseFloat(e.target.value))}
                  inputProps={{ step: 0.1, min: -1.5, max: 3.5 }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ret. Cluster 3 End"
                  type="number"
                  value={formData.ret_cluster_3_end}
                  onChange={(e) => handleFormChange('ret_cluster_3_end', parseFloat(e.target.value))}
                  inputProps={{ step: 0.1, min: -1.5, max: 3.5 }}
                />
              </Grid>
              
              {/* Extension Clusters */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Extension Clusters
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ext. Cluster 1 Start"
                  type="number"
                  value={formData.ext_cluster_1_start}
                  onChange={(e) => handleFormChange('ext_cluster_1_start', parseFloat(e.target.value))}
                  inputProps={{ step: 0.1, min: -1.5, max: 3.5 }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ext. Cluster 1 End"
                  type="number"
                  value={formData.ext_cluster_1_end}
                  onChange={(e) => handleFormChange('ext_cluster_1_end', parseFloat(e.target.value))}
                  inputProps={{ step: 0.1, min: -1.5, max: 3.5 }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ext. Cluster 2 Start"
                  type="number"
                  value={formData.ext_cluster_2_start}
                  onChange={(e) => handleFormChange('ext_cluster_2_start', parseFloat(e.target.value))}
                  inputProps={{ step: 0.1, min: -1.5, max: 3.5 }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ext. Cluster 2 End"
                  type="number"
                  value={formData.ext_cluster_2_end}
                  onChange={(e) => handleFormChange('ext_cluster_2_end', parseFloat(e.target.value))}
                  inputProps={{ step: 0.1, min: -1.5, max: 3.5 }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleSavePlaybook} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Playbook</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the playbook "{playbookToDelete?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Playbooks;