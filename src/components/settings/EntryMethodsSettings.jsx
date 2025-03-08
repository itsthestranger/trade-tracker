// src/components/settings/EntryMethodsSettings.jsx
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

const EntryMethodsSettings = ({ entryMethods, onUpdate }) => {
  // Ensure entryMethods is an array
  const entryMethodsList = Array.isArray(entryMethods) ? entryMethods : [];
  
  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentEntryMethod, setCurrentEntryMethod] = useState({
    id: null,
    name: '',
    description: '',
    color: '#4CAF50'
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [entryMethodToDelete, setEntryMethodToDelete] = useState(null);
  const [errors, setErrors] = useState({});

  const handleClickOpen = () => {
    setIsEdit(false);
    setCurrentEntryMethod({
      id: null,
      name: '',
      description: '',
      color: '#4CAF50'
    });
    setErrors({});
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setShowColorPicker(false);
  };

  const handleEdit = (entryMethod) => {
    setIsEdit(true);
    setCurrentEntryMethod({
      id: entryMethod.id,
      name: entryMethod.name,
      description: entryMethod.description || '',
      color: entryMethod.color
    });
    setErrors({});
    setOpen(true);
  };

  const handleDeleteClick = (entryMethod) => {
    setEntryMethodToDelete(entryMethod);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (entryMethodToDelete) {
      try {
        // Check if the entry method is used in any trades
        const trades = executeQuery(
          'SELECT COUNT(*) as count FROM trades WHERE entry_method_id = ?',
          [entryMethodToDelete.id]
        );
        
        const tradeCount = Array.isArray(trades) && trades.length > 0 ? trades[0].count : 0;
        
        if (tradeCount > 0) {
          alert(`Cannot delete entry method "${entryMethodToDelete.name}" because it is used in ${tradeCount} trade(s).`);
        } else {
          executeNonQuery('DELETE FROM entry_methods WHERE id = ?', [entryMethodToDelete.id]);
          if (onUpdate) onUpdate();
        }
      } catch (error) {
        console.error('Error deleting entry method:', error);
      }
    }
    setDeleteConfirmOpen(false);
    setEntryMethodToDelete(null);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setEntryMethodToDelete(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentEntryMethod({
      ...currentEntryMethod,
      [name]: value
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
    setCurrentEntryMethod({
      ...currentEntryMethod,
      color: color.hex
    });
  };

  const toggleColorPicker = () => {
    setShowColorPicker(!showColorPicker);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!currentEntryMethod.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!currentEntryMethod.color) {
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
        // Update existing entry method
        executeNonQuery(
          'UPDATE entry_methods SET name = ?, description = ?, color = ? WHERE id = ?',
          [currentEntryMethod.name, currentEntryMethod.description, currentEntryMethod.color, currentEntryMethod.id]
        );
      } else {
        // Add new entry method
        executeNonQuery(
          'INSERT INTO entry_methods (name, description, color) VALUES (?, ?, ?)',
          [currentEntryMethod.name, currentEntryMethod.description, currentEntryMethod.color]
        );
      }
      
      if (onUpdate) onUpdate();
      handleClose();
    } catch (error) {
      console.error('Error saving entry method:', error);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Entry Methods
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleClickOpen}
        >
          Add Entry Method
        </Button>
      </Box>
      
      <TableContainer component={Paper}>
        <Table aria-label="entry methods table" size="medium">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Color</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entryMethodsList.map((method) => (
              <TableRow key={method.id}>
                <TableCell>{method.name}</TableCell>
                <TableCell>{method.description}</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <CircleIcon sx={{ color: method.color, mr: 1 }} />
                    {method.color}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton onClick={() => handleEdit(method)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => handleDeleteClick(method)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {entryMethodsList.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No entry methods found. Add your first entry method.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{isEdit ? 'Edit Entry Method' : 'Add Entry Method'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {isEdit 
              ? 'Edit the entry method details.'
              : 'Add a new entry method with its description and color.'}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            name="name"
            label="Entry Method Name"
            type="text"
            fullWidth
            variant="outlined"
            value={currentEntryMethod.name}
            onChange={handleChange}
            error={!!errors.name}
            helperText={errors.name}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="description"
            name="description"
            label="Description"
            type="text"
            fullWidth
            variant="outlined"
            value={currentEntryMethod.description}
            onChange={handleChange}
            multiline
            rows={2}
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
                  backgroundColor: currentEntryMethod.color,
                  cursor: 'pointer',
                  border: '1px solid #ccc',
                  mr: 2
                }}
                onClick={toggleColorPicker}
              />
              <Typography>{currentEntryMethod.color}</Typography>
            </Box>
            {errors.color && (
              <Typography color="error" variant="caption">
                {errors.color}
              </Typography>
            )}
            {showColorPicker && (
              <Box mt={2}>
                <SketchPicker
                  color={currentEntryMethod.color}
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
        <DialogTitle>Delete Entry Method</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the entry method "{entryMethodToDelete?.name}"?
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

export default EntryMethodsSettings;