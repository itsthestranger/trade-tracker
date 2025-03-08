// src/components/backtest/BacktestList.jsx
import React, { useState } from 'react';
import { 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemText,
  IconButton, 
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  Tooltip
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon 
} from '@mui/icons-material';
import {executeNonQuery } from '../../services/database/db';

const BacktestList = ({ backtests, selectedBacktest, onBacktestSelect, onBacktestUpdate }) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentBacktest, setCurrentBacktest] = useState(null);
  const [backtestName, setBacktestName] = useState('');
  const [error, setError] = useState('');

  const handleEditClick = (event, backtest) => {
    event.stopPropagation();
    setCurrentBacktest(backtest);
    setBacktestName(backtest.name);
    setError('');
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (event, backtest) => {
    event.stopPropagation();
    setCurrentBacktest(backtest);
    setDeleteDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
  };

  const handleDeleteClose = () => {
    setDeleteDialogOpen(false);
  };

  const handleEditSave = () => {
    if (!backtestName.trim()) {
      setError('Backtest name is required');
      return;
    }
    
    try {
      executeNonQuery(
        'UPDATE backtests SET name = ? WHERE id = ?',
        [backtestName.trim(), currentBacktest.id]
      );
      
      onBacktestUpdate();
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating backtest:', error);
      setError('Failed to update backtest. Please try again.');
    }
  };

  const handleDeleteConfirm = () => {
    try {
      // Check if the backtest has trades
      if (currentBacktest.tradeCount > 0) {
        // Delete trades associated with this backtest
        executeNonQuery(
          'DELETE FROM trades WHERE backtest_id = ?',
          [currentBacktest.id]
        );
      }
      
      // Delete the backtest
      executeNonQuery(
        'DELETE FROM backtests WHERE id = ?',
        [currentBacktest.id]
      );
      
      // If the deleted backtest was selected, clear the selection
      if (selectedBacktest && selectedBacktest.id === currentBacktest.id) {
        // Find the next available backtest to select
        const remainingBacktests = backtests.filter(b => b.id !== currentBacktest.id);
        onBacktestSelect(remainingBacktests.length > 0 ? remainingBacktests[0] : null);
      }
      
      onBacktestUpdate();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting backtest:', error);
      // TODO: show error message
    }
  };

  return (
    <>
      <List sx={{ bgcolor: 'background.paper' }}>
        {backtests.map((backtest) => (
          <ListItem 
            key={backtest.id}
            disablePadding
            secondaryAction={
              <>
                <Tooltip title="Edit">
                  <IconButton 
                    edge="end" 
                    aria-label="edit"
                    onClick={(e) => handleEditClick(e, backtest)}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton 
                    edge="end" 
                    aria-label="delete"
                    onClick={(e) => handleDeleteClick(e, backtest)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </>
            }
          >
            <ListItemButton
              selected={selectedBacktest && selectedBacktest.id === backtest.id}
              onClick={() => onBacktestSelect(backtest)}
            >
              <ListItemText 
                primary={backtest.name} 
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.secondary">
                      {new Date(backtest.created_at).toLocaleDateString()} • 
                    </Typography>
                    {' '}
                    <Typography component="span" variant="body2" color="text.secondary">
                      {backtest.tradeCount} {backtest.tradeCount === 1 ? 'trade' : 'trades'}
                    </Typography>
                  </>
                }
              />
            </ListItemButton>
          </ListItem>
        ))}
        {backtests.length === 0 && (
          <ListItem>
            <ListItemText 
              primary="No backtests available" 
              secondary="Create a new backtest to get started."
            />
          </ListItem>
        )}
      </List>
      
      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={handleEditClose}>
        <DialogTitle>Edit Backtest</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Update the name of this backtest:
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Backtest Name"
            type="text"
            fullWidth
            variant="outlined"
            value={backtestName}
            onChange={(e) => setBacktestName(e.target.value)}
            error={!!error}
            helperText={error}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteClose}>
        <DialogTitle>Delete Backtest</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{currentBacktest?.name}"?
            {currentBacktest && currentBacktest.tradeCount > 0 && (
              <>
                <br /><br />
                This will also delete {currentBacktest.tradeCount} associated 
                {currentBacktest.tradeCount === 1 ? ' trade' : ' trades'}.
              </>
            )}
            <br /><br />
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BacktestList;