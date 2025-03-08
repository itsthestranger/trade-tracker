// src/components/trades/PlaybookHeatmap.jsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Card,
  CardContent
} from '@mui/material';
import { executeQuery } from '../../services/database/db';

const PlaybookHeatmap = ({ instrumentId, day, direction, confirmationTime }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playbookData, setPlaybookData] = useState(null);
  const [tradeStats, setTradeStats] = useState({
    backtests: 0,
    liveTrades: 0,
    totalTrades: 0,
    totalResult: 0
  });
  const [instrumentName, setInstrumentName] = useState('');
  
  useEffect(() => {
    if (instrumentId && day && direction && confirmationTime) {
      fetchPlaybookData();
      fetchTradeStats();
      fetchInstrumentName();
    }
  }, [instrumentId, day, direction, confirmationTime]);
  
  const fetchInstrumentName = () => {
    try {
      const result = executeQuery(`
        SELECT name FROM instruments WHERE id = ?
      `, [instrumentId]);
      
      if (result.length > 0) {
        setInstrumentName(result[0].name);
      }
    } catch (error) {
      console.error('Error fetching instrument name:', error);
    }
  };
  
  const fetchPlaybookData = () => {
    try {
      setIsLoading(true);
      
      // Query playbook based on selection
      const result = executeQuery(`
        SELECT * FROM playbooks
        WHERE 
          instrument_id = ? AND
          day = ? AND
          direction = ? AND
          confirmation_time = ?
      `, [
        instrumentId,
        day,
        direction,
        confirmationTime
      ]);
      
      if (result.length > 0) {
        setPlaybookData(result[0]);
      } else {
        setPlaybookData(null);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching playbook data:', err);
      setError(err);
      setIsLoading(false);
    }
  };
  
  const fetchTradeStats = () => {
    try {
      // Query for backtest stats
      const backtestResult = executeQuery(`
        SELECT 
          COUNT(*) as count,
          SUM(result) as total_result
        FROM trades
        WHERE 
          instrument_id = ? AND
          day = ? AND
          direction = ? AND
          confirmation_time = ? AND
          is_backtest = 1
      `, [
        instrumentId,
        day,
        direction,
        confirmationTime
      ]);
      
      // Query for live trade stats
      const liveTradeResult = executeQuery(`
        SELECT 
          COUNT(*) as count,
          SUM(result) as total_result
        FROM trades
        WHERE 
          instrument_id = ? AND
          day = ? AND
          direction = ? AND
          confirmation_time = ? AND
          is_backtest = 0
      `, [
        instrumentId,
        day,
        direction,
        confirmationTime
      ]);
      
      const backtestCount = backtestResult[0]?.count || 0;
      const liveTradeCount = liveTradeResult[0]?.count || 0;
      const backtestResult_r = backtestResult[0]?.total_result || 0;
      const liveTradeResult_r = liveTradeResult[0]?.total_result || 0;
      
      setTradeStats({
        backtests: backtestCount,
        liveTrades: liveTradeCount,
        totalTrades: backtestCount + liveTradeCount,
        totalResult: (backtestResult_r + liveTradeResult_r).toFixed(2)
      });
      
    } catch (error) {
      console.error('Error fetching trade stats:', error);
    }
  };
  
  if (error) {
    return (
      <Typography color="error">
        Error loading playbook data: {error.message}
      </Typography>
    );
  }
  
  // Formatted time ranges
  const formatTimeRange = (start, end) => {
    if (!start || !end) return 'N/A';
    return `${start} - ${end}`;
  };
  
  // Formatted value ranges
  const formatValueRange = (start, end) => {
    if (!start || !end) return 'N/A';
    return `${start?.toFixed(2)} - ${end?.toFixed(2)}`;
  };
  
  return (
    <Box>
      <Grid container spacing={2}>
        {/* Trade Stats */}
        <Grid item xs={12}>
          <Card sx={{ bgcolor: 'background.default', mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                {instrumentName} {direction} - {day} at {confirmationTime}
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    Backtest Trades
                  </Typography>
                  <Typography variant="h6">
                    {tradeStats.backtests}
                  </Typography>
                </Grid>
                
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    Live Trades
                  </Typography>
                  <Typography variant="h6">
                    {tradeStats.liveTrades}
                  </Typography>
                </Grid>
                
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    Total Result
                  </Typography>
                  <Typography variant="h6" color={tradeStats.totalResult > 0 ? 'success.main' : tradeStats.totalResult < 0 ? 'error.main' : 'text.primary'}>
                    {tradeStats.totalResult}R
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Playbook Data */}
        <Grid item xs={12}>
          {!playbookData ? (
            <Typography variant="body2" color="text.secondary" align="center">
              No playbook data available for the selected parameters.
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {/* Time Clusters */}
              <Grid item xs={12} md={6}>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Mode Time" 
                      secondary={formatTimeRange(playbookData.mode_time_start, playbookData.mode_time_end)}
                    />
                  </ListItem>
                  <Divider component="li" />
                  <ListItem>
                    <ListItemText 
                      primary="Time Cluster 1" 
                      secondary={formatTimeRange(playbookData.time_cl_1_start, playbookData.time_cl_1_end)}
                    />
                  </ListItem>
                  <Divider component="li" />
                  <ListItem>
                    <ListItemText 
                      primary="Ret. Median Time" 
                      secondary={playbookData.ret_median_time || 'N/A'}
                    />
                  </ListItem>
                  <Divider component="li" />
                  <ListItem>
                    <ListItemText 
                      primary="Dropoff Time" 
                      secondary={playbookData.dropoff_time || 'N/A'}
                    />
                  </ListItem>
                  <Divider component="li" />
                  <ListItem>
                    <ListItemText 
                      primary="Ext. Median Time" 
                      secondary={playbookData.ext_median_time || 'N/A'}
                    />
                  </ListItem>
                </List>
              </Grid>
              
              {/* Value Clusters */}
              <Grid item xs={12} md={6}>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Retracement Cluster 1" 
                      secondary={formatValueRange(playbookData.ret_cluster_1_start, playbookData.ret_cluster_1_end)}
                    />
                  </ListItem>
                  <Divider component="li" />
                  <ListItem>
                    <ListItemText 
                      primary="Retracement Cluster 2" 
                      secondary={formatValueRange(playbookData.ret_cluster_2_start, playbookData.ret_cluster_2_end)}
                    />
                  </ListItem>
                  <Divider component="li" />
                  <ListItem>
                    <ListItemText 
                      primary="Retracement Cluster 3" 
                      secondary={formatValueRange(playbookData.ret_cluster_3_start, playbookData.ret_cluster_3_end)}
                    />
                  </ListItem>
                  <Divider component="li" />
                  <ListItem>
                    <ListItemText 
                      primary="Extension Cluster 1" 
                      secondary={formatValueRange(playbookData.ext_cluster_1_start, playbookData.ext_cluster_1_end)}
                    />
                  </ListItem>
                  <Divider component="li" />
                  <ListItem>
                    <ListItemText 
                      primary="Extension Cluster 2" 
                      secondary={formatValueRange(playbookData.ext_cluster_2_start, playbookData.ext_cluster_2_end)}
                    />
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default PlaybookHeatmap;