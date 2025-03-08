// src/components/settings/AccountsSettings.jsx
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

const AccountsSettings = ({ accounts, onUpdate }) => {
  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentAccount, setCurrentAccount] = useState({
    id: null,
    name: '',
    size: 5000,
    percentEqualingOneR: 1,
    color: '#4CAF50'
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [errors, setErrors] = useState({});

  const handleClickOpen = () => {
    setIsEdit(false);
    setCurrentAccount({
      id: null,
      name: '',
      size: 5000,
      percentEqualingOneR: 1,
      color: '#4CAF50'
    });
    setErrors({});
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setShowColorPicker(false);
  };

  const handleEdit = (account) => {
    setIsEdit(true);
    setCurrentAccount({
      id: account.id,
      name: account.name,
      size: account.size,
      percentEqualingOneR: account.percentEqualingOneR,
      color: account.color
    });
    setErrors({});
    setOpen(true);
  };

  const handleDeleteClick = (account) => {
    setAccountToDelete(account);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (accountToDelete) {
      try {
        executeNonQuery('DELETE FROM accounts WHERE id = ?', [accountToDelete.id]);
        onUpdate();
      } catch (error) {
        console.error('Error deleting account:', error);
      }
    }
    setDeleteConfirmOpen(false);
    setAccountToDelete(null);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setAccountToDelete(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentAccount({
      ...currentAccount,
      [name]: ['size', 'percentEqualingOneR'].includes(name) ? parseFloat(value) : value
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
    setCurrentAccount({
      ...currentAccount,
      color: color.hex
    });
  };

  const toggleColorPicker = () => {
    setShowColorPicker(!showColorPicker);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!currentAccount.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (currentAccount.size <= 0) {
      newErrors.size = 'Account size must be greater than 0';
    }
    
    if (currentAccount.percentEqualingOneR <= 0) {
      newErrors.percentEqualingOneR = 'Percentage must be greater than 0';
    }
    
    if (!currentAccount.color) {
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
        // Update existing account
        executeNonQuery(
          'UPDATE accounts SET name = ?, size = ?, percentEqualingOneR = ?, color = ? WHERE id = ?',
          [
            currentAccount.name, 
            currentAccount.size, 
            currentAccount.percentEqualingOneR, 
            currentAccount.color, 
            currentAccount.id
          ]
        );
      } else {
        // Add new account
        executeNonQuery(
          'INSERT INTO accounts (name, size, percentEqualingOneR, color) VALUES (?, ?, ?, ?)',
          [
            currentAccount.name, 
            currentAccount.size, 
            currentAccount.percentEqualingOneR, 
            currentAccount.color
          ]
        );
      }
      
      onUpdate();
      handleClose();
    } catch (error) {
      console.error('Error saving account:', error);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Accounts
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleClickOpen}
        >
          Add Account
        </Button>
      </Box>
      
      <TableContainer component={Paper}>
        <Table aria-label="accounts table" size="medium">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>% Equaling 1R</TableCell>
              <TableCell>Color</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell>{account.name}</TableCell>
                <TableCell>{account.size.toLocaleString()}</TableCell>
                <TableCell>{account.percentEqualingOneR}%</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <CircleIcon sx={{ color: account.color, mr: 1 }} />
                    {account.color}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton onClick={() => handleEdit(account)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => handleDeleteClick(account)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {accounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No accounts found. Add your first account.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{isEdit ? 'Edit Account' : 'Add Account'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {isEdit 
              ? 'Edit the account details.'
              : 'Add a new account with its size, risk percentage, and color.'}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            name="name"
            label="Account Name"
            type="text"
            fullWidth
            variant="outlined"
            value={currentAccount.name}
            onChange={handleChange}
            error={!!errors.name}
            helperText={errors.name}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="size"
            name="size"
            label="Account Size"
            type="number"
            fullWidth
            variant="outlined"
            value={currentAccount.size}
            onChange={handleChange}
            error={!!errors.size}
            helperText={errors.size}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="percentEqualingOneR"
            name="percentEqualingOneR"
            label="% Equaling 1R"
            type="number"
            fullWidth
            variant="outlined"
            value={currentAccount.percentEqualingOneR}
            onChange={handleChange}
            error={!!errors.percentEqualingOneR}
            helperText={errors.percentEqualingOneR}
            inputProps={{ step: 0.1 }}
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
                  backgroundColor: currentAccount.color,
                  cursor: 'pointer',
                  border: '1px solid #ccc',
                  mr: 2
                }}
                onClick={toggleColorPicker}
              />
              <Typography>{currentAccount.color}</Typography>
            </Box>
            {errors.color && (
              <Typography color="error" variant="caption">
                {errors.color}
              </Typography>
            )}
            {showColorPicker && (
              <Box mt={2}>
                <SketchPicker
                  color={currentAccount.color}
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
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the account "{accountToDelete?.name}"?
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

export default AccountsSettings;