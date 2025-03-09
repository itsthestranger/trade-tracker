// src/components/settings/DatabaseTools.jsx
import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  CardHeader,
  Alert, 
  AlertTitle,
  Snackbar,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControlLabel,
  Checkbox,
  TextField,
  Grid
} from '@mui/material';
import { 
  CloudDownload as DownloadIcon, 
  CloudUpload as UploadIcon,
  Settings as SettingsIcon,
  RestartAlt as ResetIcon
} from '@mui/icons-material';

import dbStorageService from '../../services/database/dbStorageService';

const DatabaseTools = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [configOpen, setConfigOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(dbStorageService.autoSaveEnabled);
  const [autoSaveInterval, setAutoSaveInterval] = useState(dbStorageService.autoSaveIntervalMs / 60000); // Convert ms to minutes

  const handleExportDatabase = async () => {
    setIsLoading(true);
    try {
      const success = await dbStorageService.saveToFile();
      setSnackbar({
        open: true,
        message: success ? 'Database exported successfully' : 'Failed to export database',
        severity: success ? 'success' : 'error'
      });
    } catch (error) {
      console.error('Error exporting database:', error);
      setSnackbar({
        open: true,
        message: `Error exporting database: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportDatabase = async () => {
    setIsLoading(true);
    try {
      const success = await dbStorageService.loadFromFile();
      setSnackbar({
        open: true,
        message: success ? 'Database imported successfully. Please reload the application.' : 'Failed to import database',
        severity: success ? 'success' : 'error'
      });
      
      // Force page reload if successful
      if (success) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      console.error('Error importing database:', error);
      setSnackbar({
        open: true,
        message: `Error importing database: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleOpenConfig = () => {
    setConfigOpen(true);
  };

  const handleCloseConfig = () => {
    setConfigOpen(false);
  };

  const handleSaveConfig = () => {
    // Convert minutes to milliseconds for internal storage
    const intervalMs = autoSaveInterval * 60000;
    dbStorageService.configureAutoSave(autoSaveEnabled, intervalMs);
    
    setSnackbar({
      open: true,
      message: 'Database settings saved',
      severity: 'success'
    });
    
    setConfigOpen(false);
  };

  const handleOpenResetConfirm = () => {
    setResetConfirmOpen(true);
  };

  const handleCloseResetConfirm = () => {
    setResetConfirmOpen(false);
  };

  const handleResetDatabase = async () => {
    setIsLoading(true);
    try {
      // Close current database
      dbStorageService.close();
      
      // Clear localStorage
      localStorage.removeItem('trade-tracker-db');
      
      // Reinitialize
      await dbStorageService.initialize();
      
      setSnackbar({
        open: true,
        message: 'Database reset successfully. The page will now reload.',
        severity: 'success'
      });
      
      // Force page reload
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error resetting database:', error);
      setSnackbar({
        open: true,
        message: `Error resetting database: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
      setResetConfirmOpen(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Database Tools" />
      <CardContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Data Storage Information</AlertTitle>
          <Typography variant="body2">
            Your data is stored in a SQLite database file within your browser. 
            Use the export function to save your data as a file for backup or 
            transfer between devices.
          </Typography>
        </Alert>

        {isLoading && <LinearProgress sx={{ mb: 3 }} />}

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="contained" 
              color="primary"
              startIcon={<DownloadIcon />}
              onClick={handleExportDatabase}
              disabled={isLoading}
              fullWidth
            >
              Export Database
            </Button>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<UploadIcon />}
              onClick={handleImportDatabase}
              disabled={isLoading}
              fullWidth
            >
              Import Database
            </Button>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<SettingsIcon />}
              onClick={handleOpenConfig}
              disabled={isLoading}
              fullWidth
            >
              Database Settings
            </Button>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<ResetIcon />}
              onClick={handleOpenResetConfirm}
              disabled={isLoading}
              fullWidth
            >
              Reset Database
            </Button>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            How to use:
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
            <li>Export Database: Save your data as a file that you can backup or commit to Git</li>
            <li>Import Database: Load previously exported database file</li>
            <li>Database Settings: Configure auto-save behavior</li>
            <li>Reset Database: Clear all data and reset to default values</li>
          </Typography>
        </Box>
      </CardContent>

      {/* Settings Dialog */}
      <Dialog open={configOpen} onClose={handleCloseConfig}>
        <DialogTitle>Database Settings</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Configure how the database is stored and backed up.
          </DialogContentText>
          
          <Box sx={{ pt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                />
              }
              label="Enable Auto-Save"
            />
            
            <TextField
              margin="dense"
              id="autoSaveInterval"
              label="Auto-Save Interval (minutes)"
              type="number"
              fullWidth
              variant="outlined"
              value={autoSaveInterval}
              onChange={(e) => setAutoSaveInterval(Math.max(1, parseInt(e.target.value) || 1))}
              disabled={!autoSaveEnabled}
              inputProps={{ min: 1 }}
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfig}>Cancel</Button>
          <Button onClick={handleSaveConfig} variant="contained">Save Settings</Button>
        </DialogActions>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog
        open={resetConfirmOpen}
        onClose={handleCloseResetConfirm}
      >
        <DialogTitle>Reset Database</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will delete all your current data and reset the database to its default state.
            This action cannot be undone.
          </DialogContentText>
          <Alert severity="warning" sx={{ mt: 2 }}>
            We recommend exporting your database before resetting, if you want to keep your data.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResetConfirm}>Cancel</Button>
          <Button onClick={handleResetDatabase} color="error" variant="contained">
            Reset Database
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={snackbar.message}
      />
    </Card>
  );
};

export default DatabaseTools;