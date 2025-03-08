// src/components/backtest/TradeDocumentationView.jsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  CardHeader, 
  Chip, 
  CircularProgress, 
  Paper,
  Avatar,
  Stack
} from '@mui/material';
import { 
  TrendingUp as TrendingUpIcon, 
  TrendingDown as TrendingDownIcon,
  MoreHoriz as BreakEvenIcon
} from '@mui/icons-material';
import { executeQuery } from '../../services/database/db';
import { ensureArray } from '../../utils/arrayUtils';

const TradeDocumentationView = ({ isBacktest = true, backtestId = null }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tradeJournals, setTradeJournals] = useState([]);
  
  useEffect(() => {
    fetchTradeJournals();
  }, [isBacktest, backtestId]);
  
  const fetchTradeJournals = async () => {
    try {
      setIsLoading(true);
      
      // Build base query conditions
      let conditions = "WHERE t.is_backtest = ?";
      let params = [isBacktest ? 1 : 0];
      
      if (isBacktest && backtestId) {
        conditions += " AND t.backtest_id = ?";
        params.push(backtestId);
      }
      
      // Query to get trades with journal entries
      const journalResult = await executeQuery(`
        SELECT 
          t.id,
          t.date,
          t.day,
          t.confirmation_time,
          t.direction,
          t.session,
          t.status,
          t.result,
          i.name as instrument_name,
          i.color as instrument_color,
          j.journal_text,
          j.tradingview_link,
          j.body_mind_state,
          j.created_at
        FROM trades t
        JOIN trade_journal j ON t.id = j.trade_id
        JOIN instruments i ON t.instrument_id = i.id
        ${conditions}
        ORDER BY t.date DESC, t.confirmation_time DESC
      `, params);
      
      // Ensure journalResult is an array
      const journalArray = ensureArray(journalResult);
      
      if (journalArray.length === 0) {
        setTradeJournals([]);
        setIsLoading(false);
        return;
      }
      
      // Get confluences for each trade
      const journalEntriesWithConfluences = await Promise.all(
        journalArray.map(async (journal) => {
          const confluenceResult = await executeQuery(`
            SELECT c.name
            FROM trade_confluences tc
            JOIN confluences c ON tc.confluence_id = c.id
            WHERE tc.trade_id = ?
          `, [journal.id]);
          
          // Ensure confluenceResult is an array
          const confluenceArray = ensureArray(confluenceResult);
          
          return {
            ...journal,
            confluences: confluenceArray.map(c => c.name)
          };
        })
      );
      
      setTradeJournals(journalEntriesWithConfluences);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching trade journals:', err);
      setError(err);
      setIsLoading(false);
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
          Error: {error.message || "An error occurred loading trade documentation"}
        </Typography>
      </Box>
    );
  }
  
  if (tradeJournals.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" align="center">
            No trade documentation available
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary">
            Add documentation to your trades to see them here
          </Typography>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Trade Documentation
      </Typography>
      
      <Stack spacing={3}>
        {ensureArray(tradeJournals).map((journal) => (
          <Paper 
            key={journal.id} 
            elevation={2}
            sx={{ overflow: 'hidden' }}
          >
            <CardHeader
              avatar={
                <Avatar 
                  sx={{ 
                    bgcolor: journal.instrument_color || 'primary.main',
                    color: '#fff'
                  }}
                >
                  {journal.instrument_name ? journal.instrument_name.charAt(0) : 'T'}
                </Avatar>
              }
              title={`${journal.instrument_name} - ${journal.direction} (${journal.session})`}
              subheader={`${journal.date} at ${journal.confirmation_time} - ${journal.day}`}
              action={
                <Box sx={{ mt: 1, mr: 1 }}>
                  {journal.status === 'Winner' ? (
                    <Chip 
                      icon={<TrendingUpIcon />} 
                      label={`${journal.result > 0 ? '+' : ''}${journal.result?.toFixed(2)}R`} 
                      color="success" 
                      size="small"
                    />
                  ) : journal.status === 'Expense' ? (
                    <Chip 
                      icon={<TrendingDownIcon />} 
                      label={`${journal.result?.toFixed(2)}R`} 
                      color="error" 
                      size="small"
                    />
                  ) : (
                    <Chip 
                      icon={<BreakEvenIcon />} 
                      label="Break Even" 
                      color="warning" 
                      size="small"
                    />
                  )}
                </Box>
              }
            />
            
            <CardContent>
              {/* Confluences */}
              {journal.confluences && journal.confluences.length > 0 && (
                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Confluences:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {ensureArray(journal.confluences).map((confluence, idx) => (
                      <Chip key={idx} label={confluence} size="small" />
                    ))}
                  </Box>
                </Box>
              )}
              
              {/* Body & Mind State */}
              {journal.body_mind_state && (
                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Body & Mind State:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {ensureArray(journal.body_mind_state.split(',')).map((state, idx) => (
                      <Chip key={idx} label={state} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}
              
              {/* Journal Text */}
              {journal.journal_text && (
                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Journal:
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {journal.journal_text}
                  </Typography>
                </Box>
              )}
              
              {/* Trading View Chart */}
              {journal.tradingview_link && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Chart:
                  </Typography>
                  <Box 
                    component="img" 
                    src={journal.tradingview_link}
                    alt="TradingView Chart" 
                    sx={{ 
                      maxWidth: '100%',
                      maxHeight: '500px',
                      objectFit: 'contain',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '';
                      e.target.alt = 'Invalid image URL';
                    }}
                  />
                </Box>
              )}
            </CardContent>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
};

export default TradeDocumentationView;