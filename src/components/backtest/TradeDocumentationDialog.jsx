// src/components/backtest/TradeDocumentationDialog.jsx
import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  Typography, 
  Box, 
  Grid, 
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText
} from '@mui/material';
import { executeQuery, executeNonQuery } from '../../services/database/db';

// Body & Mind states options
const bodyMindStates = [
  'Alcohol', 'Bad Sleep', 'Calm', 'Fit', 'Good Sleep', 'Gym', 
  'Impatient', 'Meditation', 'Nervous', 'Physical Exercise', 
  'Stressed', 'Tired', 'Sick'
];

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const TradeDocumentationDialog = ({ open, onClose, tradeId, onSave }) => {
  const [loading, setLoading] = useState(true);
  const [trade, setTrade] = useState(null);
  const [confluences, setConfluences] = useState([]);
  const [selectedConfluences, setSelectedConfluences] = useState([]);
  const [journalText, setJournalText] = useState('');
  const [tradingviewLink, setTradingviewLink] = useState('');
  const [bodyMindState, setBodyMindState] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (tradeId) {
      fetchTradeInfo();
      fetchConfluences();
    }
  }, [tradeId]);

  const fetchTradeInfo = async () => {
    try {
      setLoading(true);
      
      // Fetch trade details
      const tradeResult = executeQuery(`
        SELECT t.*, i.name as instrument_name
        FROM trades t
        LEFT JOIN instruments i ON t.instrument_id = i.id
        WHERE t.id = ?
      `, [tradeId]);
      
      if (tradeResult.length > 0) {
        setTrade(tradeResult[0]);
        
        // Fetch trade journal if exists
        const journalResult = executeQuery(`
          SELECT * FROM trade_journal WHERE trade_id = ?
        `, [tradeId]);
        
        if (journalResult.length > 0) {
          setJournalText(journalResult[0].journal_text || '');
          setTradingviewLink(journalResult[0].tradingview_link || '');
          setBodyMindState(journalResult[0].body_mind_state ? journalResult[0].body_mind_state.split(',') : []);
        } else {
          setJournalText('');
          setTradingviewLink('');
          setBodyMindState([]);
        }
        
        // Fetch selected confluences
        const confluenceResult = executeQuery(`
          SELECT confluence_id FROM trade_confluences WHERE trade_id = ?
        `, [tradeId]);
        
        setSelectedConfluences(confluenceResult.map(item => item.confluence_id));
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching trade info:', error);
      setError(error);
      setLoading(false);
    }
  };

  const fetchConfluences = async () => {
    try {
      const confluenceResult = executeQuery(`
        SELECT * FROM confluences ORDER BY name
      `);
      
      setConfluences(confluenceResult);
    } catch (error) {
      console.error('Error fetching confluences:', error);
    }
  };

  const handleSave = async () => {
    try {
      // Check if trade journal exists
      const journalExists = executeQuery(`
        SELECT id FROM trade_journal WHERE trade_id = ?
      `, [tradeId]);
      
      if (journalExists.length > 0) {
        // Update existing journal
        executeNonQuery(`
          UPDATE trade_journal 
          SET journal_text = ?, tradingview_link = ?, body_mind_state = ?
          WHERE trade_id = ?
        `, [
          journalText,
          tradingviewLink,
          bodyMindState.join(','),
          tradeId
        ]);
      } else {
        // Insert new journal
        executeNonQuery(`
          INSERT INTO trade_journal (trade_id, journal_text, tradingview_link, body_mind_state)
          VALUES (?, ?, ?, ?)
        `, [
          tradeId,
          journalText,
          tradingviewLink,
          bodyMindState.join(',')
        ]);
      }
      
      // Delete existing confluence associations
      executeNonQuery(`
        DELETE FROM trade_confluences WHERE trade_id = ?
      `, [tradeId]);
      
      // Insert new confluence associations
      if (selectedConfluences.length > 0) {
        selectedConfluences.forEach(confluenceId => {
          executeNonQuery(`
            INSERT INTO trade_confluences (trade_id, confluence_id)
            VALUES (?, ?)
          `, [tradeId, confluenceId]);
        });
      }
      
      if (onSave) {
        onSave();
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving trade documentation:', error);
      setError(error);
    }
  };

  const handleConfluenceChange = (event) => {
    const {
      target: { value },
    } = event;
    setSelectedConfluences(
      // On autofill we get a stringified value.
      typeof value === 'string' ? value.split(',').map(id => parseInt(id, 10)) : value
    );
  };

  const handleBodyMindStateChange = (event) => {
    const {
      target: { value },
    } = event;
    setBodyMindState(
      // On autofill we get a stringified value.
      typeof value === 'string' ? value.split(',') : value
    );
  };

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" p={5}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Error</DialogTitle>
        <DialogContent>
          <Typography color="error">
            An error occurred: {error.message}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (!trade) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Trade Not Found</DialogTitle>
        <DialogContent>
          <Typography>
            The requested trade could not be found.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Trade Documentation: {trade.instrument_name} - {trade.date}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          {/* Trade Info Summary */}
          <Grid item xs={12}>
            <Box
              sx={{
                p: 2,
                mb: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.paper',
              }}
            >
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    Date / Time
                  </Typography>
                  <Typography variant="body2">
                    {trade.date} - {trade.confirmation_time}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    Direction / Session
                  </Typography>
                  <Typography variant="body2">
                    {trade.direction} / {trade.session}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Typography variant="body2" color={
                    trade.status === 'Winner' ? 'success.main' : 
                    trade.status === 'Expense' ? 'error.main' : 
                    'text.primary'
                  }>
                    {trade.status}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    Result
                  </Typography>
                  <Typography variant="body2" color={
                    (trade.result > 0) ? 'success.main' : 
                    (trade.result < 0) ? 'error.main' : 
                    'text.primary'
                  }>
                    {trade.result ? `${trade.result.toFixed(2)}R` : 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Grid>
          
          {/* Confluences Selection */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="confluences-label">Confluences</InputLabel>
              <Select
                labelId="confluences-label"
                id="confluences"
                multiple
                value={selectedConfluences}
                onChange={handleConfluenceChange}
                input={<OutlinedInput label="Confluences" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const confluence = confluences.find(c => c.id === value);
                      return (
                        <Chip key={value} label={confluence ? confluence.name : value} />
                      );
                    })}
                  </Box>
                )}
                MenuProps={MenuProps}
              >
                {confluences.map((confluence) => (
                  <MenuItem key={confluence.id} value={confluence.id}>
                    <Checkbox checked={selectedConfluences.indexOf(confluence.id) > -1} />
                    <ListItemText primary={confluence.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {/* Body & Mind State */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="body-mind-label">Body & Mind State</InputLabel>
              <Select
                labelId="body-mind-label"
                id="body-mind"
                multiple
                value={bodyMindState}
                onChange={handleBodyMindStateChange}
                input={<OutlinedInput label="Body & Mind State" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} />
                    ))}
                  </Box>
                )}
                MenuProps={MenuProps}
              >
                {bodyMindStates.map((state) => (
                  <MenuItem key={state} value={state}>
                    <Checkbox checked={bodyMindState.indexOf(state) > -1} />
                    <ListItemText primary={state} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {/* TradingView Link */}
          <Grid item xs={12}>
            <TextField
              label="TradingView Link"
              fullWidth
              value={tradingviewLink}
              onChange={(e) => setTradingviewLink(e.target.value)}
              variant="outlined"
            />
          </Grid>
          
          {/* Journal Notes */}
          <Grid item xs={12}>
            <TextField
              label="Trade Journal"
              multiline
              rows={6}
              fullWidth
              value={journalText}
              onChange={(e) => setJournalText(e.target.value)}
              variant="outlined"
              placeholder="Add your trade notes, observations, and lessons learned..."
            />
          </Grid>
          
          {/* TradingView Chart Preview */}
          {tradingviewLink && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Chart Preview:
              </Typography>
              <Box 
                component="img" 
                src={tradingviewLink}
                alt="TradingView Chart" 
                sx={{ 
                  maxWidth: '100%',
                  maxHeight: '400px',
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
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TradeDocumentationDialog;