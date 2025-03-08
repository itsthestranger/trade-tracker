// src/components/settings/ConfluencesSettings.jsx
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
  Slider,
  Card,
  CardContent
} from '@mui/material';
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { executeQuery, executeNonQuery } from '../../services/database/db';
import { ensureArray, safeMap } from '../../utils/arrayUtils';

const ConfluencesSettings = ({ confluences, minConfluences, onUpdate }) => {
  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentConfluence, setCurrentConfluence] = useState({
    id: null,
    name: ''
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [confluenceToDelete, setConfluenceToDelete] = useState(null);
  const [errors, setErrors] = useState({});
  const [localMinConfluences, setLocalMinConfluences] = useState(minConfluences);

  const handleClickOpen = () => {
    setIsEdit(false);
    setCurrentConfluence({
      id: null,
      name: ''
    });
    setErrors({});
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleEdit = (confluence) => {
    setIsEdit(true);
    setCurrentConfluence({
      id: confluence.id,
      name: confluence.name
    });
    setErrors({});
    setOpen(true);
  };

  const handleDeleteClick = (confluence) => {
    setConfluenceToDelete(confluence);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (confluenceToDelete) {
      try {
        // Check if the confluence is used in any trade-confluence relationships
        const tradeConfluences = executeQuery(
          'SELECT COUNT(*) as count FROM trade_confluences WHERE confluence_id = ?',
          [confluenceToDelete.id]
        );
        
        if (tradeConfluences[0].count > 0) {
          alert(`Cannot delete confluence "${confluenceToDelete.name}" because it is used in ${tradeConfluences[0].count} trade(s).`);
        } else {
          executeNonQuery('DELETE FROM confluences WHERE id = ?', [confluenceToDelete.id]);
          onUpdate('confluences');
        }
      } catch (error) {
        console.error('Error deleting confluence:', error);
      }
    }
    setDeleteConfirmOpen(false);
    setConfluenceToDelete(null);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setConfluenceToDelete(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentConfluence({
      ...currentConfluence,
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

  const handleMinConfluencesChange = (event, newValue) => {
    setLocalMinConfluences(newValue);
  };

  const handleMinConfluencesChangeCommitted = (event, newValue) => {
    try {
      // Update the minimum confluences required setting
      executeNonQuery(
        "UPDATE app_settings SET value = ? WHERE key = 'minimumConfluencesRequired'",
        [newValue.toString()]
      );
      onUpdate('minConfluences');
    } catch (error) {
      console.error('Error updating minimum confluences:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!currentConfluence.name.trim()) {
      newErrors.name = 'Name is required';
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
        // Update existing confluence
        executeNonQuery(
          'UPDATE confluences SET name = ? WHERE id = ?',
          [currentConfluence.name, currentConfluence.id]
        );
      } else {
        // Add new confluence
        executeNonQuery(
          'INSERT INTO confluences (name) VALUES (?)',
          [currentConfluence.name]
        );
      }
      
      onUpdate('confluences');
      handleClose();
    } catch (error) {
      console.error('Error saving confluence:', error);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Confluences
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleClickOpen}
        >
          Add Confluence
        </Button>
      </Box>
      
      {/* Minimum Confluences Setting */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Minimum Confluences Required
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Set the minimum number of confluences required to execute a trade.
          </Typography>
          <Box sx={{ px: 2, mt: 3 }}>
            <Slider
              value={localMinConfluences}
              onChange={handleMinConfluencesChange}
              onChangeCommitted={handleMinConfluencesChangeCommitted}
              step={1}
              marks
              min={1}
              max={5}
              valueLabelDisplay="on"
            />
          </Box>
        </CardContent>
      </Card>
      
      {/* Confluences Table */}
      <TableContainer component={Paper}>
        <Table aria-label="confluences table" size="medium">
          <TableHead>
            <TableRow>
              <TableCell>Confluence Name</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ensureArray(confluences).map((confluence) => (
              <TableRow key={confluence.id}>
                <TableCell>{confluence.name}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton onClick={() => handleEdit(confluence)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => handleDeleteClick(confluence)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {confluences.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} align="center">
                  No confluences found. Add your first confluence.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{isEdit ? 'Edit Confluence' : 'Add Confluence'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {isEdit 
              ? 'Edit the confluence name.'
              : 'Add a new confluence for your trades.'}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            name="name"
            label="Confluence Name"
            type="text"
            fullWidth
            variant="outlined"
            value={currentConfluence.name}
            onChange={handleChange}
            error={!!errors.name}
            helperText={errors.name}
            sx={{ mb: 2 }}
          />
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
        <DialogTitle>Delete Confluence</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the confluence "{confluenceToDelete?.name}"?
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

export default ConfluencesSettings;