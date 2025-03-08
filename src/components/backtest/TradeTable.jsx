// src/components/backtest/TradeTable.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Button, 
  IconButton, 
  Tooltip, 
  Tabs, 
  Tab, 
  Dialog, 
  CircularProgress,
  Typography
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  ContentCopy as DuplicateIcon,
  Delete as DeleteIcon,
  Description as DocumentIcon,
  FilterAlt as FilterIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { executeQuery, executeNonQuery, getLastInsertId } from '../../services/database/db';
import TradeDocumentationDialog from './TradeDocumentationDialog';
import FilterDialog from './FilterDialog';

const TradeTable = ({ isBacktest = true, backtestId = null, onTradeUpdate }) => {
  const [trades, setTrades] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [entryMethods, setEntryMethods] = useState([]);
  const [filters, setFilters] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState(0); // 0 for "All Trades"
  const [openDocDialog, setOpenDocDialog] = useState(false);
  const [openFilterDialog, setOpenFilterDialog] = useState(false);
  const [selectedTradeId, setSelectedTradeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 25,
    page: 0,
  });

  const fetchFilters = useCallback(() => {
    try {
      const results = executeQuery(
        `SELECT * FROM filters WHERE type = ? ORDER BY id`,
        [isBacktest ? 'backtest' : 'trade']
      );
      setFilters(results);
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  }, [isBacktest]);

  const fetchSettings = useCallback(() => {
    try {
      // Fetch instruments
      const instrumentsData = executeQuery('SELECT * FROM instruments ORDER BY name');
      setInstruments(instrumentsData);
      
      // Fetch entry methods
      const entryMethodsData = executeQuery('SELECT * FROM entry_methods ORDER BY name');
      setEntryMethods(entryMethodsData);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, []);

  const fetchTrades = useCallback(() => {
    setLoading(true);
    try {
      let query = `
        SELECT 
          t.*,
          i.name as instrument_name,
          i.tickValue,
          e.name as entry_method_name
        FROM trades t
        LEFT JOIN instruments i ON t.instrument_id = i.id
        LEFT JOIN entry_methods e ON t.entry_method_id = e.id
        WHERE t.is_backtest = ?
      `;
      
      let params = [isBacktest ? 1 : 0];
      
      if (isBacktest && backtestId) {
        query += ' AND t.backtest_id = ?';
        params.push(backtestId);
      }
      
      // Apply filter if not "All Trades"
      if (selectedFilter > 0 && filters.length > 0) {
        const filterIndex = selectedFilter - 1; // Adjust for "All Trades" tab
        if (filterIndex < filters.length) {
          const filterCriteria = JSON.parse(filters[filterIndex].criteria);
          
          // Add WHERE clauses based on filter criteria
          Object.entries(filterCriteria).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              if (Array.isArray(value)) {
                // Range filter (from, to)
                if (value[0] !== null) {
                  query += ` AND ${key} >= ?`;
                  params.push(value[0]);
                }
                if (value[1] !== null) {
                  query += ` AND ${key} <= ?`;
                  params.push(value[1]);
                }
              } else if (typeof value === 'object') {
                // Complex filter (e.g., confluences)
                // Handle specially depending on structure
              } else {
                // Simple equality filter
                query += ` AND ${key} = ?`;
                params.push(value);
              }
            }
          });
        }
      }
      
      query += ' ORDER BY t.date DESC, t.confirmation_time';
      
      const results = executeQuery(query, params);
      
      // Process results to calculate any derived values
      const processedTrades = results.map(trade => ({
        ...trade,
        // Calculate derived fields if not already set
        stop_ticks: trade.stop_ticks || calculateStopTicks(trade),
        pot_result: trade.pot_result || calculatePotResult(trade),
        result: trade.result || calculateResult(trade),
        average: trade.average || calculateAverage(trade),
      }));
      
      setTrades(processedTrades);
      if (onTradeUpdate) {
        onTradeUpdate();
      }
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setLoading(false);
    }
  }, [isBacktest, backtestId, selectedFilter, filters, onTradeUpdate]);

  useEffect(() => {
    fetchSettings();
    fetchFilters();
  }, [fetchSettings, fetchFilters]);

  useEffect(() => {
    if (instruments.length > 0 && entryMethods.length > 0) {
      fetchTrades();
    }
  }, [instruments, entryMethods, fetchTrades]);

  // Helper functions for calculations
  const calculateStopTicks = (trade) => {
    return Math.abs(trade.entry - trade.stop) / (trade.tickValue || 0.25);
  };

  const calculatePotResult = (trade) => {
    if (!trade.entry || !trade.stop || !trade.target) return 0;
    return Math.abs(trade.target - trade.entry) / Math.abs(trade.entry - trade.stop);
  };

  const calculateResult = (trade) => {
    if (!trade.exit || !trade.entry || !trade.stop) return null;
    return Math.abs(trade.exit - trade.entry) / Math.abs(trade.entry - trade.stop) * (trade.exit > trade.entry ? 1 : -1);
  };

  const calculateAverage = (trade) => {
    const scores = [
      trade.preparation,
      trade.entry_score,
      trade.stop_loss,
      trade.target_score,
      trade.management,
      trade.rules
    ].filter(Boolean);
    
    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
  };

  const handleAddTrade = () => {
    // Create a new trade with default values
    const defaultInstrumentId = instruments.length > 0 ? instruments[0].id : null;
    const defaultEntryMethodId = entryMethods.length > 0 ? entryMethods[0].id : null;
    
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().substring(0, 5);
    const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
    
    try {
      executeNonQuery(`
        INSERT INTO trades (
          date, day, confirmation_time, entry_time, instrument_id, confirmation_type, 
          direction, session, entry_method_id, stopped_out, status, 
          entry, stop, target, is_backtest, is_planned, backtest_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        today, 
        dayOfWeek, 
        time, 
        time, 
        defaultInstrumentId, 
        'Wick Confirmation', 
        'Long', 
        'ODR', 
        defaultEntryMethodId, 
        0, 
        'Winner', 
        0, 
        0, 
        0, 
        isBacktest ? 1 : 0, 
        isBacktest ? 0 : 1, 
        isBacktest ? backtestId : null
      ]);
      
      // Refresh trades
      fetchTrades();
    } catch (error) {
      console.error('Error adding trade:', error);
    }
  };

  const handleDuplicateTrade = (tradeId) => {
    try {
      // First, get the trade to duplicate
      const tradeResult = executeQuery(`SELECT * FROM trades WHERE id = ?`, [tradeId]);
      
      if (tradeResult.length > 0) {
        const trade = tradeResult[0];
        
        // Insert a duplicate with new ID
        executeNonQuery(`
          INSERT INTO trades (
            date, day, confirmation_time, entry_time, instrument_id, confirmation_type, 
            direction, session, entry_method_id, stopped_out, status, 
            ret_entry, sd_exit, entry, stop, target, exit,
            preparation, entry_score, stop_loss, target_score, management, rules,
            is_backtest, is_planned, backtest_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          trade.date, 
          trade.day, 
          trade.confirmation_time, 
          trade.entry_time, 
          trade.instrument_id, 
          trade.confirmation_type, 
          trade.direction, 
          trade.session, 
          trade.entry_method_id, 
          trade.stopped_out, 
          trade.status, 
          trade.ret_entry, 
          trade.sd_exit, 
          trade.entry, 
          trade.stop, 
          trade.target, 
          trade.exit,
          trade.preparation, 
          trade.entry_score, 
          trade.stop_loss, 
          trade.target_score, 
          trade.management, 
          trade.rules,
          isBacktest ? 1 : 0, 
          trade.is_planned, 
          isBacktest ? backtestId : null
        ]);
        
        const newTradeId = getLastInsertId();
        
        // Duplicate documentation if any
        const journalResult = executeQuery(`SELECT * FROM trade_journal WHERE trade_id = ?`, [tradeId]);
        if (journalResult.length > 0) {
          const journal = journalResult[0];
          
          executeNonQuery(`
            INSERT INTO trade_journal (trade_id, journal_text, tradingview_link, body_mind_state)
            VALUES (?, ?, ?, ?)
          `, [
            newTradeId,
            journal.journal_text,
            journal.tradingview_link,
            journal.body_mind_state
          ]);
        }
        
        // Duplicate confluences if any
        const confluencesResult = executeQuery(`SELECT * FROM trade_confluences WHERE trade_id = ?`, [tradeId]);
        if (confluencesResult.length > 0) {
          confluencesResult.forEach(confluence => {
            executeNonQuery(`
              INSERT INTO trade_confluences (trade_id, confluence_id)
              VALUES (?, ?)
            `, [
              newTradeId,
              confluence.confluence_id
            ]);
          });
        }
        
        // Refresh trades
        fetchTrades();
      }
    } catch (error) {
      console.error('Error duplicating trade:', error);
    }
  };

  const handleDeleteTrade = (tradeId) => {
    try {
      executeNonQuery(`DELETE FROM trades WHERE id = ?`, [tradeId]);
      fetchTrades();
    } catch (error) {
      console.error('Error deleting trade:', error);
    }
  };

  const handleOpenDocumentation = (tradeId) => {
    setSelectedTradeId(tradeId);
    setOpenDocDialog(true);
  };

  const handleCloseDocumentation = () => {
    setSelectedTradeId(null);
    setOpenDocDialog(false);
  };

  const handleOpenFilterDialog = () => {
    setOpenFilterDialog(true);
  };

  const handleCloseFilterDialog = () => {
    setOpenFilterDialog(false);
    fetchFilters(); // Refresh filters after dialog closes
  };

  const handleFilterChange = (event, newValue) => {
    setSelectedFilter(newValue);
  };

  const handleCellEditCommit = (params) => {
    try {
      const { id, field, value } = params;
      
      // Handle special calculations for certain fields
      if (['entry', 'stop', 'target', 'exit'].includes(field)) {
        const trade = trades.find(t => t.id === id);
        if (trade) {
          // Update the field
          executeNonQuery(`UPDATE trades SET ${field} = ? WHERE id = ?`, [value, id]);
          
          // Recalculate derived fields
          if (field === 'entry' || field === 'stop') {
            const stopTicks = Math.abs(
              field === 'entry' ? value - trade.stop : trade.entry - value
            ) / (trade.tickValue || 0.25);
            
            executeNonQuery(`UPDATE trades SET stop_ticks = ? WHERE id = ?`, [stopTicks, id]);
          }
          
          if (field === 'entry' || field === 'stop' || field === 'target') {
            const entry = field === 'entry' ? value : trade.entry;
            const stop = field === 'stop' ? value : trade.stop;
            const target = field === 'target' ? value : trade.target;
            
            const potResult = Math.abs(target - entry) / Math.abs(entry - stop);
            executeNonQuery(`UPDATE trades SET pot_result = ? WHERE id = ?`, [potResult, id]);
            
            // Recalculate result if exit exists
            if (trade.exit !== null) {
              const result = Math.abs(trade.exit - entry) / Math.abs(entry - stop) * (trade.exit > entry ? 1 : -1);
              executeNonQuery(`UPDATE trades SET result = ? WHERE id = ?`, [result, id]);
            }
          }
          
          if (field === 'exit') {
            const result = Math.abs(value - trade.entry) / Math.abs(trade.entry - trade.stop) * (value > trade.entry ? 1 : -1);
            executeNonQuery(`UPDATE trades SET result = ? WHERE id = ?`, [result, id]);
            
            // Update status based on result
            let status = 'Break Even';
            if (result > 0.1) status = 'Winner';
            else if (result < -0.1) status = 'Expense';
            
            executeNonQuery(`UPDATE trades SET status = ? WHERE id = ?`, [status, id]);
          }
        }
      } else if (['preparation', 'entry_score', 'stop_loss', 'target_score', 'management', 'rules'].includes(field)) {
        // Update the score
        executeNonQuery(`UPDATE trades SET ${field} = ? WHERE id = ?`, [value, id]);
        
        // Recalculate average
        const scores = executeQuery(`
          SELECT preparation, entry_score, stop_loss, target_score, management, rules
          FROM trades WHERE id = ?
        `, [id])[0];
        
        const validScores = Object.values(scores).filter(score => score !== null);
        const average = validScores.length > 0 ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length : null;
        
        executeNonQuery(`UPDATE trades SET average = ? WHERE id = ?`, [average, id]);
      } else {
        // For other fields, just update directly
        if (field === 'day') {
          // Validate day of week
          const validDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
          if (!validDays.includes(value)) {
            return; // Ignore invalid days
          }
        }
        
        // For other fields, just update directly
        executeNonQuery(`UPDATE trades SET ${field} = ? WHERE id = ?`, [value, id]);
      }
      
      // Refresh trades to reflect changes
      fetchTrades();
    } catch (error) {
      console.error('Error updating cell:', error);
    }
  };

  const columns = [
    { field: 'day', headerName: 'Day', width: 70, editable: true },
    { field: 'date', headerName: 'Date', width: 110, editable: true, type: 'date' },
    { field: 'confirmation_time', headerName: 'Conf. Time', width: 95, editable: true },
    { field: 'entry_time', headerName: 'Entry Time', width: 95, editable: true },
    { 
      field: 'instrument_id', 
      headerName: 'Instrument', 
      width: 150, 
      editable: true, 
      type: 'singleSelect',
      valueOptions: instruments.map(instrument => ({ value: instrument.id, label: instrument.name })),
      valueFormatter: (params) => {
        const instrument = instruments.find(i => i.id === params.value);
        return instrument ? instrument.name : '';
      }
    },
    { 
      field: 'confirmation_type', 
      headerName: 'Conf. Type', 
      width: 130, 
      editable: true,
      type: 'singleSelect',
      valueOptions: ['Wick Confirmation', 'Full Confirmation', 'Early Indication', 'No Confirmation']
    },
    { 
      field: 'direction', 
      headerName: 'Direction', 
      width: 90, 
      editable: true,
      type: 'singleSelect',
      valueOptions: ['Long', 'Short']
    },
    { 
      field: 'session', 
      headerName: 'Session', 
      width: 90, 
      editable: true,
      type: 'singleSelect',
      valueOptions: ['ODR', 'RDR']
    },
    { 
      field: 'entry_method_id', 
      headerName: 'Entry Method', 
      width: 150, 
      editable: true,
      type: 'singleSelect',
      valueOptions: entryMethods.map(method => ({ value: method.id, label: method.name })),
      valueFormatter: (params) => {
        const method = entryMethods.find(m => m.id === params.value);
        return method ? method.name : '';
      }
    },
    { 
      field: 'stopped_out', 
      headerName: 'Stopped Out', 
      width: 100, 
      editable: true,
      type: 'boolean'
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 100, 
      editable: true,
      type: 'singleSelect',
      valueOptions: ['Winner', 'Expense', 'Break Even']
    },
    { field: 'ret_entry', headerName: 'Ret. Entry', width: 90, editable: true, type: 'number' },
    { field: 'sd_exit', headerName: 'SD Exit', width: 80, editable: true, type: 'number' },
    { field: 'entry', headerName: 'Entry', width: 90, editable: true, type: 'number' },
    { field: 'stop', headerName: 'Stop', width: 90, editable: true, type: 'number' },
    { field: 'target', headerName: 'Target', width: 90, editable: true, type: 'number' },
    { field: 'exit', headerName: 'Exit', width: 90, editable: true, type: 'number' },
    { field: 'stop_ticks', headerName: 'Stop Ticks', width: 90, editable: false, type: 'number' },
    { field: 'pot_result', headerName: 'Pot. Result', width: 90, editable: false, type: 'number' },
    { field: 'result', headerName: 'Result', width: 90, editable: false, type: 'number' },
    { 
      field: 'preparation', 
      headerName: 'Prep.', 
      width: 70, 
      editable: true, 
      type: 'singleSelect',
      valueOptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    },
    { 
      field: 'entry_score', 
      headerName: 'Entry', 
      width: 70, 
      editable: true, 
      type: 'singleSelect',
      valueOptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    },
    { 
      field: 'stop_loss', 
      headerName: 'Stop Loss', 
      width: 85, 
      editable: true, 
      type: 'singleSelect',
      valueOptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    },
    { 
      field: 'target_score', 
      headerName: 'Target', 
      width: 70, 
      editable: true, 
      type: 'singleSelect',
      valueOptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    },
    { 
      field: 'management', 
      headerName: 'Mgmt.', 
      width: 70, 
      editable: true, 
      type: 'singleSelect',
      valueOptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    },
    { 
      field: 'rules', 
      headerName: 'Rules', 
      width: 70, 
      editable: true, 
      type: 'singleSelect',
      valueOptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    },
    { field: 'average', headerName: 'Average', width: 80, editable: false, type: 'number' },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <>
          <Tooltip title="Documentation">
            <IconButton onClick={() => handleOpenDocumentation(params.row.id)}>
              <DocumentIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Duplicate">
            <IconButton onClick={() => handleDuplicateTrade(params.row.id)}>
              <DuplicateIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton onClick={() => handleDeleteTrade(params.row.id)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  return (
    <Box sx={{ height: 'calc(100vh - 300px)', width: '100%' }}>
      {/* Filter Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, display: 'flex', alignItems: 'center' }}>
        <Tabs value={selectedFilter} onChange={handleFilterChange}>
          <Tab label="All Trades" />
          {filters.map((filter, index) => (
            <Tab key={filter.id} label={filter.name} />
          ))}
        </Tabs>
        <Box sx={{ ml: 2 }}>
          <Tooltip title="Manage Filters">
            <IconButton onClick={handleOpenFilterDialog}>
              <FilterIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Action Buttons */}
      <Box sx={{ mb: 2 }}>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleAddTrade}
          sx={{ mr: 1 }}
        >
          Add Trade
        </Button>
      </Box>
      
      {/* Trade Table */}
      {instruments.length === 0 || entryMethods.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Configuration Needed
          </Typography>
          <Typography variant="body1">
            Please set up instruments and entry methods in the Settings section before adding trades.
          </Typography>
        </Box>
      ) : (
        <DataGrid
          rows={trades}
          columns={columns}
          loading={loading}
          components={{
            LoadingOverlay: CircularProgress,
          }}
          pageSizeOptions={[25, 50, 100]}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          autoHeight
          density="compact"
          onCellEditCommit={handleCellEditCommit}
          getRowClassName={(params) => {
            if (params.row.exit !== null && params.row.exit < params.row.target && !params.row.stopped_out) {
              return 'chicken-out-row'; // Style for "Chicken Out" trades
            }
            return '';
          }}
          sx={{
            '& .chicken-out-row': {
              bgcolor: '#fff9c4', // Light yellow background
            },
            '& .MuiDataGrid-row:hover': {
              bgcolor: 'rgba(0, 0, 0, 0.04)',
            },
          }}
        />
      )}
      
      {/* Documentation Dialog */}
      {openDocDialog && (
        <TradeDocumentationDialog
          open={openDocDialog}
          onClose={handleCloseDocumentation}
          tradeId={selectedTradeId}
          onSave={fetchTrades}
        />
      )}
      
      {/* Filter Dialog */}
      {openFilterDialog && (
        <FilterDialog
          open={openFilterDialog}
          onClose={handleCloseFilterDialog}
          type={isBacktest ? 'backtest' : 'trade'}
          instruments={instruments}
          entryMethods={entryMethods}
        />
      )}
    </Box>
  );
};

export default TradeTable;