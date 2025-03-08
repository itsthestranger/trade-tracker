// src/components/settings/InstrumentsSettings.jsx - Updated to add instruments directly to storage
import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogContentText, 
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Tooltip,
  Divider
} from '@mui/material';
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Circle as CircleIcon,
  BugReport as BugReportIcon
} from '@mui/icons-material';
import { executeQuery, executeNonQuery } from '../../services/database/db';
import { SketchPicker } from 'react-color';
import DatabaseDebugger from './DatabaseDebugger'; // Import the debugger component
import localforage from 'localforage'; // Import localforage for direct access
import { ensureArray, safeMap } from '../../utils/arrayUtils';

const InstrumentsSettings = ({ instruments, onUpdate }) => {
  // Ensure instruments is an array
  const instrumentsList = Array.isArray(instruments) ? instruments : [];
  
  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentInstrument, setCurrentInstrument] = useState({
    id: null,
    name: '',
    tickValue: 0.25,
    color: '#4CAF50'
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [instrumentToDelete, setInstrumentToDelete] = useState(null);
  const [errors, setErrors] = useState({});
  const [showDebugger, setShowDebugger] = useState(false);

  const handleClickOpen = () => {
    setIsEdit(false);
    setCurrentInstrument({
      id: null,
      name: '',
      tickValue: 0.25,
      color: '#4CAF50'
    });
    setErrors({});
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setShowColorPicker(false);
  };

  const handleEdit = (instrument) => {
    setIsEdit(true);
    setCurrentInstrument({
      id: instrument.id,
      name: instrument.name,
      tickValue: instrument.tickValue,
      color: instrument.color
    });
    setErrors({});
    setOpen(true);
  };

  const handleDeleteClick = (instrument) => {
    setInstrumentToDelete(instrument);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (instrumentToDelete) {
      try {
        // For simplicity, we'll just delete directly for now
        const instrumentsStore = localforage.createInstance({ name: 'instruments' });
        await instrumentsStore.removeItem(instrumentToDelete.id.toString());
        console.log(`Deleted instrument with ID ${instrumentToDelete.id}`);
        
        if (onUpdate) {
          onUpdate();
        }
      } catch (error) {
        console.error('Error deleting instrument:', error);
        alert(`Error deleting instrument: ${error.message}`);
      }
    }
    setDeleteConfirmOpen(false);
    setInstrumentToDelete(null);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setInstrumentToDelete(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentInstrument({
      ...currentInstrument,
      [name]: name === 'tickValue' ? parseFloat(value) : value
    });
    
    // Clear validation error when field is changed
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const handleColorChange = (color) => {
    setCurrentInstrument({
      ...currentInstrument,
      color: color.hex
    });
  };

  const toggleColorPicker = () => {
    setShowColorPicker(!showColorPicker);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!currentInstrument.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (isNaN(currentInstrument.tickValue) || currentInstrument.tickValue <= 0) {
      newErrors.tickValue = 'Tick value must be greater than 0';
    }
    
    if (!currentInstrument.color) {
      newErrors.color = 'Color is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      console.log("Saving instrument:", currentInstrument);
      
      // Get direct access to the instruments store
      const instrumentsStore = localforage.createInstance({ name: 'instruments' });
      
      if (isEdit) {
        // Update existing instrument directly
        console.log("Updating instrument with ID:", currentInstrument.id);
        await instrumentsStore.setItem(
          currentInstrument.id.toString(), 
          { ...currentInstrument }
        );
      } else {
        // Add new instrument directly
        // First get all keys to find the next ID
        const keys = await instrumentsStore.keys();
        const nextId = keys.length > 0 
          ? Math.max(...keys.map(k => parseInt(k))) + 1 
          : 1;
        
        console.log(`Adding new instrument with ID ${nextId}:`, currentInstrument.name);
        
        await instrumentsStore.setItem(
          nextId.toString(), 
          { 
            ...currentInstrument,
            id: nextId
          }
        );
      }
      
      console.log("Instrument saved successfully!");
      
      // Call onUpdate to refresh the UI
      if (onUpdate) {
        console.log("Calling onUpdate to refresh instruments list");
        onUpdate();
      }
      
      handleClose();
    } catch (error) {
      console.error('Error saving instrument:', error);
      alert(`Error saving instrument: ${error.message}`);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Instruments
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<BugReportIcon />}
            onClick={() => setShowDebugger(!showDebugger)}
            sx={{ mr: 1 }}
          >
            {showDebugger ? "Hide" : "Show"} Debugger
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleClickOpen}
          >
            Add Instrument
          </Button>
        </Box>
      </Box>
      
      {/* Current state debugging */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Current instruments in state: {instrumentsList.length}
        </Typography>
      </Box>
      
      <TableContainer component={Paper}>
        <Table aria-label="instruments table" size="medium">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Tick Value</TableCell>
              <TableCell>Color</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ensureArray(instrumentsList).map((instrument) => (
              <TableRow key={instrument.id}>
                <TableCell>{instrument.id}</TableCell>
                <TableCell>{instrument.name}</TableCell>
                <TableCell>{instrument.tickValue}</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <CircleIcon sx={{ color: instrument.color, mr: 1 }} />
                    {instrument.color}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton onClick={() => handleEdit(instrument)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => handleDeleteClick(instrument)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {instrumentsList.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No instruments found. Add your first instrument.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Database Debugger */}
      {showDebugger && (
        <DatabaseDebugger onUpdate={onUpdate} />
      )}
      
      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{isEdit ? 'Edit Instrument' : 'Add Instrument'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {isEdit 
              ? 'Edit the instrument details.'
              : 'Add a new instrument with its tick value and color.'}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            name="name"
            label="Instrument Name"
            type="text"
            fullWidth
            variant="outlined"
            value={currentInstrument.name}
            onChange={handleChange}
            error={!!errors.name}
            helperText={errors.name}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="tickValue"
            name="tickValue"
            label="Tick Value per 1 Unit"
            type="number"
            fullWidth
            variant="outlined"
            value={currentInstrument.tickValue}
            onChange={handleChange}
            error={!!errors.tickValue}
            helperText={errors.tickValue}
            inputProps={{ step: 0.01 }}
            sx={{ mb: 2 }}
          />
          <Box mb={2}>
            <Typography variant="subtitle2" gutterBottom>
              Color
            </Typography>
            <Box display="flex" alignItems="center">
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '4px',
                  backgroundColor: currentInstrument.color,
                  cursor: 'pointer',
                  border: '1px solid #ccc',
                  mr: 2
                }}
                onClick={toggleColorPicker}
              />
              <Typography>{currentInstrument.color}</Typography>
            </Box>
            {errors.color && (
              <Typography color="error" variant="caption">
                {errors.color}
              </Typography>
            )}
            {showColorPicker && (
              <Box mt={2}>
                <SketchPicker
                  color={currentInstrument.color}
                  onChangeComplete={handleColorChange}
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Delete Instrument</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the instrument "{instrumentToDelete?.name}"?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InstrumentsSettings;