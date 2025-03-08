// src/pages/Trades.jsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Card, 
  CardContent, 
  Grid, 
  CircularProgress
} from '@mui/material';
import { executeQuery } from '../services/database/db';
import TradeTable from '../components/backtest/TradeTable';
import TradeDocumentationView from '../components/backtest/TradeDocumentationView';
import PerformanceReport from '../components/backtest/PerformanceReport';
import TradePlanner from '../components/trades/TradePlanner';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`trades-tabpanel-${index}`}
      aria-labelledby={`trades-tab-${index}`}
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
    id: `trades-tab-${index}`,
    'aria-controls': `trades-tabpanel-${index}`,
  };
}

const Trades = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [tradeStats, setTradeStats] = useState({
    total: 0,
    planned: 0,
    executed: 0
  });
  
  useEffect(() => {
    fetchTradeStats();
  }, []);
  
  const fetchTradeStats = async () => {
    try {
      setIsLoading(true);
      
      const statsResult = executeQuery(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_planned = 1 THEN 1 ELSE 0 END) as planned,
          SUM(CASE WHEN is_planned = 0 THEN 1 ELSE 0 END) as executed
        FROM trades
        WHERE is_backtest = 0
      `);
      
      if (statsResult.length > 0) {
        setTradeStats(statsResult[0]);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching trade stats:', err);
      setError(err);
      setIsLoading(false);
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
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
        Trades
      </Typography>
      
      {/* Trade Stats */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary.main">
                  {tradeStats.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Trades
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box textAlign="center">
                <Typography variant="h4" color="info.main">
                  {tradeStats.planned}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Planned Trades
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box textAlign="center">
                <Typography variant="h4" color="success.main">
                  {tradeStats.executed}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Executed Trades
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="trades tabs"
          variant="fullWidth"
        >
          <Tab label="Trades List" {...a11yProps(0)} />
          <Tab label="Documentation" {...a11yProps(1)} />
          <Tab label="Performance Report" {...a11yProps(2)} />
          <Tab label="Trade Planner" {...a11yProps(3)} />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <TradeTable 
          isBacktest={false} 
          onTradeUpdate={fetchTradeStats}
        />
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <TradeDocumentationView 
          isBacktest={false} 
        />
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        <PerformanceReport 
          isBacktest={false} 
        />
      </TabPanel>
      
      <TabPanel value={tabValue} index={3}>
        <TradePlanner />
      </TabPanel>
    </Box>
  );
};

export default Trades;