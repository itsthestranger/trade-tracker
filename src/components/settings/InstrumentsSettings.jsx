// src/components/settings/InstrumentsSettings.jsx
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
  Tooltip
} from '@mui/material';
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Circle as CircleIcon
} from '@mui/icons-material';
import { executeQuery, executeNonQuery } from '../../services/database/db';
import { SketchPicker } from 'react-color';

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

  const handleDeleteConfirm = () => {
    if (instrumentToDelete) {
      try {
        // Check if the instrument is used in any trades
        const trades = executeQuery(
          'SELECT COUNT(*) as count FROM trades WHERE instrument_id = ?',
          [instrumentToDelete.id]
        );
        
        const tradeCount = Array.isArray(trades) && trades.length > 0 ? trades[0].count : 0;
        
        if (tradeCount > 0) {
          alert(`Cannot delete instrument "${instrumentToDelete.name}" because it is used in ${tradeCount} trade(s).`);
        } else {
          // Check if the instrument is used in any playbooks
          const playbooks = executeQuery(
            'SELECT COUNT(*) as count FROM playbooks WHERE instrument_id = ?',
            [instrumentToDelete.id]
          );
          
          const playbookCount = Array.isArray(playbooks) && playbooks.length > 0 ? playbooks[0].count : 0;
          
          if (playbookCount > 0) {
            alert(`Cannot delete instrument "${instrumentToDelete.name}" because it is used in ${playbookCount} playbook(s).`);
          } else {
            executeNonQuery('DELETE FROM instruments WHERE id = ?', [instrumentToDelete.id]);
            if (onUpdate) onUpdate();
          }
        }
      } catch (error) {
        console.error('Error deleting instrument:', error);
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
    
    if (currentInstrument.tickValue <= 0) {
      newErrors.tickValue = 'Tick value must be greater than 0';
    }
    
    if (!currentInstrument.color) {
      newErrors.color = 'Color is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      if (isEdit) {
        // Update existing instrument
        executeNonQuery(
          'UPDATE instruments SET name = ?, tickValue = ?, color = ? WHERE id = ?',
          [currentInstrument.name, currentInstrument.tickValue, currentInstrument.color, currentInstrument.id]
        );
      } else {
        // Add new instrument
        executeNonQuery(
          'INSERT INTO instruments (name, tickValue, color) VALUES (?, ?, ?)',
          [currentInstrument.name, currentInstrument.tickValue, currentInstrument.color]
        );
      }
      
      if (onUpdate) onUpdate();
      handleClose();
    } catch (error) {
      console.error('Error saving instrument:', error);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Instruments
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleClickOpen}
        >
          Add Instrument
        </Button>
      </Box>
      
      <TableContainer component={Paper}>
        <Table aria-label="instruments table" size="medium">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Tick Value</TableCell>
              <TableCell>Color</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {instrumentsList.map((instrument) => (
              <TableRow key={instrument.id}>
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
                <TableCell colSpan={4} align="center">
                  No instruments found. Add your first instrument.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
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