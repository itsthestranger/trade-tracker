// src/pages/Backtest.jsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Card, 
  CardContent, 
  Button, 
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { executeQuery, executeNonQuery, getLastInsertId } from '../services/database/db';
import BacktestList from '../components/backtest/BacktestList';
import TradeTable from '../components/backtest/TradeTable';
import TradeDocumentationView from '../components/backtest/TradeDocumentationView';
import PerformanceReport from '../components/backtest/PerformanceReport';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`backtest-tabpanel-${index}`}
      aria-labelledby={`backtest-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `backtest-tab-${index}`,
    'aria-controls': `backtest-tabpanel-${index}`,
  };
}

const Backtest = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backtests, setBacktests] = useState([]);
  const [selectedBacktest, setSelectedBacktest] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [newBacktestDialogOpen, setNewBacktestDialogOpen] = useState(false);
  const [newBacktestName, setNewBacktestName] = useState('');
  const [newBacktestError, setNewBacktestError] = useState('');

  useEffect(() => {
    fetchBacktests();
  }, []);

  const fetchBacktests = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all backtests
      const backtestData = executeQuery(`
        SELECT b.*, 
          (SELECT COUNT(*) FROM trades WHERE backtest_id = b.id) as tradeCount
        FROM backtests b
        ORDER BY b.created_at DESC
      `);
      
      setBacktests(backtestData);
      
      // Select the first backtest if exists and none is selected
      if (backtestData.length > 0 && !selectedBacktest) {
        setSelectedBacktest(backtestData[0]);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching backtests:', err);
      setError(err);
      setIsLoading(false);
    }
  };

  const handleBacktestSelect = (backtest) => {
    setSelectedBacktest(backtest);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleNewBacktestClick = () => {
    setNewBacktestName('');
    setNewBacktestError('');
    setNewBacktestDialogOpen(true);
  };

  const handleNewBacktestClose = () => {
    setNewBacktestDialogOpen(false);
  };

  const handleNewBacktestCreate = () => {
    if (!newBacktestName.trim()) {
      setNewBacktestError('Backtest name is required');
      return;
    }
    
    try {
      // Create new backtest
      executeNonQuery(
        'INSERT INTO backtests (name, created_at) VALUES (?, datetime("now"))',
        [newBacktestName.trim()]
      );
      
      // Get the ID of the new backtest
      const newBacktestId = getLastInsertId();
      
      // Create the new backtest object
      const newBacktest = {
        id: newBacktestId,
        name: newBacktestName.trim(),
        created_at: new Date().toISOString(),
        tradeCount: 0
      };
      
      // Update the backtests list and select the new backtest
      setBacktests([newBacktest, ...backtests]);
      setSelectedBacktest(newBacktest);
      
      // Close the dialog
      setNewBacktestDialogOpen(false);
    } catch (error) {
      console.error('Error creating new backtest:', error);
      setNewBacktestError('Failed to create backtest. Please try again.');
    }
  };

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

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Backtest
      </Typography>
      
      {/* Backtest Selection Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Select Backtest
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleNewBacktestClick}
            >
              New Backtest
            </Button>
          </Box>
          
          <BacktestList 
            backtests={backtests} 
            selectedBacktest={selectedBacktest}
            onBacktestSelect={handleBacktestSelect} 
            onBacktestUpdate={fetchBacktests}
          />
        </CardContent>
      </Card>
      
      {/* Backtest Content */}
      {selectedBacktest ? (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange} 
              aria-label="backtest tabs"
              variant="fullWidth"
            >
              <Tab label="Trades" {...a11yProps(0)} />
              <Tab label="Documentation" {...a11yProps(1)} />
              <Tab label="Performance Report" {...a11yProps(2)} />
            </Tabs>
          </Box>
          
          <TabPanel value={tabValue} index={0}>
            <TradeTable 
              isBacktest={true} 
              backtestId={selectedBacktest.id}
              onTradeUpdate={() => {
                // Update backtest info when trades are modified
                fetchBacktests();
              }}
            />
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <TradeDocumentationView 
              isBacktest={true} 
              backtestId={selectedBacktest.id} 
            />
          </TabPanel>
          
          <TabPanel value={tabValue} index={2}>
            <PerformanceReport 
              isBacktest={true} 
              backtestId={selectedBacktest.id}
            />
          </TabPanel>
        </>
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 5 }}>
            <Typography variant="h6">
              No backtests found
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Create a new backtest to start tracking your trading performance.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleNewBacktestClick}
            >
              Create Backtest
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* New Backtest Dialog */}
      <Dialog open={newBacktestDialogOpen} onClose={handleNewBacktestClose}>
        <DialogTitle>Create New Backtest</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter a name for the new backtest:
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Backtest Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newBacktestName}
            onChange={(e) => setNewBacktestName(e.target.value)}
            error={!!newBacktestError}
            helperText={newBacktestError}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleNewBacktestClose}>Cancel</Button>
          <Button onClick={handleNewBacktestCreate} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Backtest;