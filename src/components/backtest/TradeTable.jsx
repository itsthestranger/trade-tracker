// src/components/backtest/TradeTable.jsx - Modified instrumentsMap part
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
import localforage from 'localforage';

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

  // Fetch instruments and entry methods directly from localforage
  const fetchSettingsDirect = useCallback(async () => {
    try {
      // Fetch instruments directly
      const instrumentsStore = localforage.createInstance({ name: 'instruments' });
      const instrumentsList = [];
      await instrumentsStore.iterate((value) => {
        instrumentsList.push(value);
      });
      console.log("Direct instruments fetch in TradeTable:", instrumentsList);
      setInstruments(instrumentsList);
      
      // Fetch entry methods directly
      const entryMethodsStore = localforage.createInstance({ name: 'entry_methods' });
      const entryMethodsList = [];
      await entryMethodsStore.iterate((value) => {
        entryMethodsList.push(value);
      });
      setEntryMethods(entryMethodsList);
    } catch (error) {
      console.error("Error fetching settings in TradeTable:", error);
    }
  }, []);

  const fetchFilters = useCallback(async () => {
    try {
      console.log("Fetching filters directly from localforage...");
      const filtersStore = localforage.createInstance({ name: 'filters' });
      const filtersList = [];
      
      await filtersStore.iterate((value) => {
        // Only include filters matching the current type
        if (value.type === (isBacktest ? 'backtest' : 'trade')) {
          filtersList.push(value);
        }
      });
      
      console.log(`Loaded ${filtersList.length} filters of type ${isBacktest ? 'backtest' : 'trade'}`);
      setFilters(filtersList);
    } catch (error) {
      console.error('Error fetching filters:', error);
      // Initialize with empty array if there's an error
      setFilters([]);
    }
  }, [isBacktest]);

  useEffect(() => {
    // Load settings first, then fetch trades
    fetchSettingsDirect().then(() => {
      fetchFilters();
    });
  }, [fetchSettingsDirect, fetchFilters]);

  useEffect(() => {
    // Only fetch trades after instruments and entry methods are loaded
    if (instruments.length > 0 && entryMethods.length > 0) {
      fetchTrades();
    }
  }, [instruments, entryMethods, selectedFilter]);

  const fetchTrades = useCallback(() => {
    if (!instruments.length || !entryMethods.length) {
      console.log("Waiting for instruments and entry methods to load...");
      return;
    }
    
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
      const processedTrades = Array.isArray(results) ? results.map(trade => ({
        ...trade,
        // Calculate derived fields if not already set
        stop_ticks: trade.stop_ticks || calculateStopTicks(trade),
        pot_result: trade.pot_result || calculatePotResult(trade),
        result: trade.result || calculateResult(trade),
        average: trade.average || calculateAverage(trade),
      })) : [];
      
      setTrades(processedTrades);
      if (onTradeUpdate) {
        onTradeUpdate();
      }
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setLoading(false);
    }
  }, [isBacktest, backtestId, selectedFilter, filters, onTradeUpdate, instruments, entryMethods]);

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

  const handleAddTrade = async () => {
    try {
      console.log("Adding a new trade...");
      
      // Get first instrument and entry method for defaults
      let defaultInstrumentId = null;
      let defaultEntryMethodId = null;
      
      // Try to get instruments from state first
      if (Array.isArray(instruments) && instruments.length > 0) {
        defaultInstrumentId = instruments[0].id;
        console.log("Using instrument from state:", defaultInstrumentId);
      } else {
        // Fallback to direct storage access
        try {
          const instrumentsStore = localforage.createInstance({ name: 'instruments' });
          let found = false;
          
          await instrumentsStore.iterate((value) => {
            if (!found) {
              defaultInstrumentId = value.id;
              found = true;
              console.log("Using instrument from storage:", defaultInstrumentId);
              return true; // Stop iteration
            }
          });
        } catch (err) {
          console.error("Failed to get instruments from storage:", err);
        }
      }
      
      // Try to get entry methods from state first
      if (Array.isArray(entryMethods) && entryMethods.length > 0) {
        defaultEntryMethodId = entryMethods[0].id;
        console.log("Using entry method from state:", defaultEntryMethodId);
      } else {
        // Fallback to direct storage access
        try {
          const entryMethodsStore = localforage.createInstance({ name: 'entry_methods' });
          let found = false;
          
          await entryMethodsStore.iterate((value) => {
            if (!found) {
              defaultEntryMethodId = value.id;
              found = true;
              console.log("Using entry method from storage:", defaultEntryMethodId);
              return true; // Stop iteration
            }
          });
        } catch (err) {
          console.error("Failed to get entry methods from storage:", err);
        }
      }
      
      if (!defaultInstrumentId) {
        alert("No instruments found. Please add instruments in Settings first.");
        return;
      }
      
      const today = new Date().toISOString().split('T')[0];
      const time = new Date().toTimeString().substring(0, 5);
      const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
      
      console.log("Inserting new trade with params:", {
        date: today,
        day: dayOfWeek,
        time: time,
        instrumentId: defaultInstrumentId,
        entryMethodId: defaultEntryMethodId,
        isBacktest: isBacktest,
        backtestId: backtestId
      });
      
      // Insert directly into the trades store instead of using executeNonQuery
      const tradesStore = localforage.createInstance({ name: 'trades' });
      
      // Get current keys to determine next ID
      const keys = await tradesStore.keys();
      const ids = keys.map(k => parseInt(k)).filter(id => !isNaN(id));
      const newId = ids.length > 0 ? Math.max(...ids) + 1 : 1;
      
      // Create the trade record
      const tradeRecord = {
        id: newId,
        date: today,
        day: dayOfWeek,
        confirmation_time: time,
        entry_time: time,
        instrument_id: defaultInstrumentId,
        confirmation_type: 'Wick Confirmation',
        direction: 'Long',
        session: 'ODR',
        entry_method_id: defaultEntryMethodId,
        stopped_out: 0,
        status: 'Winner',
        entry: 0,
        stop: 0,
        target: 0,
        is_backtest: isBacktest ? 1 : 0,
        is_planned: isBacktest ? 0 : 1,
        backtest_id: isBacktest ? backtestId : null,
        created_at: new Date().toISOString()
      };
      
      // Save the trade directly
      await tradesStore.setItem(newId.toString(), tradeRecord);
      console.log("Successfully inserted trade with ID:", newId);
      
      // Refresh trades
      fetchTrades();
    } catch (error) {
      console.error('Error in handleAddTrade:', error);
      alert(`Error adding trade: ${error.message}`);
    }
  };

  // TradeTable.jsx - Missing handler functions implementation

  const handleDuplicateTrade = (tradeId) => {
    try {
      console.log(`Duplicating trade with ID: ${tradeId}`);
      
      // First, get the trade to duplicate - using direct localforage access
      const tradesStore = localforage.createInstance({ name: 'trades' });
      tradesStore.getItem(tradeId.toString())
        .then(async (trade) => {
          if (!trade) {
            console.error(`Trade with ID ${tradeId} not found`);
            return;
          }

          // Generate new ID
          const keys = await tradesStore.keys();
          const nextId = keys.length > 0 
            ? Math.max(...keys.map(k => parseInt(k))) + 1 
            : 1;

          // Create a duplicate without the ID
          const duplicateTrade = {
            ...trade,
            id: nextId,
            is_backtest: isBacktest ? 1 : 0,
            backtest_id: isBacktest ? backtestId : null,
            created_at: new Date().toISOString()
          };
          
          // Save the duplicate
          await tradesStore.setItem(nextId.toString(), duplicateTrade);
          console.log(`Created duplicate trade with ID: ${nextId}`);
          
          // Duplicate documentation if any
          const journalStore = localforage.createInstance({ name: 'trade_journal' });
          const journalKeys = await journalStore.keys();
          
          // Find any journal entries for the original trade
          for (const key of journalKeys) {
            const journal = await journalStore.getItem(key);
            if (journal && journal.trade_id === tradeId) {
              // Create a new journal entry for the duplicated trade
              const journalNextId = parseInt(key) + 1;
              await journalStore.setItem(journalNextId.toString(), {
                ...journal,
                id: journalNextId,
                trade_id: nextId,
                created_at: new Date().toISOString()
              });
              console.log(`Duplicated journal entry with ID: ${journalNextId}`);
            }
          }
          
          // Duplicate confluences if any
          const confluencesStore = localforage.createInstance({ name: 'trade_confluences' });
          const confluenceKeys = await confluencesStore.keys();
          
          // Find any confluences for the original trade
          for (const key of confluenceKeys) {
            const confluence = await confluencesStore.getItem(key);
            if (confluence && confluence.trade_id === tradeId) {
              // Create a new confluence entry for the duplicated trade
              const confluenceNextId = parseInt(key) + 1;
              await confluencesStore.setItem(confluenceNextId.toString(), {
                ...confluence,
                id: confluenceNextId,
                trade_id: nextId
              });
              console.log(`Duplicated confluence link with ID: ${confluenceNextId}`);
            }
          }
          
          // Refresh trades
          fetchTrades();
        });
    } catch (error) {
      console.error('Error duplicating trade:', error);
      alert(`Error duplicating trade: ${error.message}`);
    }
  };

  const handleDeleteTrade = (tradeId) => {
    try {
      console.log(`Deleting trade with ID: ${tradeId}`);
      
      // Delete directly from storage
      const tradesStore = localforage.createInstance({ name: 'trades' });
      tradesStore.removeItem(tradeId.toString())
        .then(() => {
          console.log(`Deleted trade with ID: ${tradeId}`);
          
          // Also delete related journal entries and confluences
          const journalStore = localforage.createInstance({ name: 'trade_journal' });
          const confluencesStore = localforage.createInstance({ name: 'trade_confluences' });
          
          // Find and delete journal entries
          journalStore.iterate((value, key) => {
            if (value.trade_id === tradeId) {
              journalStore.removeItem(key);
              console.log(`Deleted journal entry with key: ${key}`);
            }
          });
          
          // Find and delete confluence links
          confluencesStore.iterate((value, key) => {
            if (value.trade_id === tradeId) {
              confluencesStore.removeItem(key);
              console.log(`Deleted confluence link with key: ${key}`);
            }
          });
          
          // Refresh trades
          fetchTrades();
        });
    } catch (error) {
      console.error('Error deleting trade:', error);
      alert(`Error deleting trade: ${error.message}`);
    }
  };

  const handleOpenDocumentation = (tradeId) => {
    console.log(`Opening documentation for trade ID: ${tradeId}`);
    setSelectedTradeId(tradeId);
    setOpenDocDialog(true);
  };

  const handleCloseDocumentation = () => {
    console.log('Closing documentation dialog');
    setSelectedTradeId(null);
    setOpenDocDialog(false);
  };

  const handleOpenFilterDialog = () => {
    console.log('Opening filter dialog');
    setOpenFilterDialog(true);
  };

  const handleCloseFilterDialog = () => {
    console.log('Closing filter dialog');
    setOpenFilterDialog(false);
    // Refresh filters after dialog closes
    fetchFilters();
  };

  const handleFilterChange = (event, newValue) => {
    // Make sure newValue is valid (exists in our filters array + 1 for "All Trades")
    if (newValue === 0 || (Array.isArray(filters) && newValue <= filters.length)) {
      console.log(`Changing selected filter to ${newValue}`);
      setSelectedFilter(newValue);
    } else {
      console.warn(`Invalid filter index: ${newValue}, reverting to "All Trades"`);
      setSelectedFilter(0); // Default to "All Trades"
    }
  };

  const handleCellEditCommit = (params) => {
    try {
      const { id, field, value } = params;
      console.log(`Editing cell: trade ID ${id}, field ${field}, value ${value}`);
      
      // Get the trade directly from storage
      const tradesStore = localforage.createInstance({ name: 'trades' });
      tradesStore.getItem(id.toString())
        .then(async (trade) => {
          if (!trade) {
            console.error(`Trade with ID ${id} not found`);
            return;
          }
          
          // Create updated trade object
          const updatedTrade = { ...trade };
          
          // Handle special calculations for certain fields
          if (['entry', 'stop', 'target', 'exit'].includes(field)) {
            // Update the field
            updatedTrade[field] = value;
            
            // Recalculate derived fields
            if (field === 'entry' || field === 'stop') {
              const stopTicks = Math.abs(
                field === 'entry' ? value - trade.stop : trade.entry - value
              ) / (trade.tickValue || 0.25);
              
              updatedTrade.stop_ticks = stopTicks;
            }
            
            if (field === 'entry' || field === 'stop' || field === 'target') {
              const entry = field === 'entry' ? value : trade.entry;
              const stop = field === 'stop' ? value : trade.stop;
              const target = field === 'target' ? value : trade.target;
              
              if (entry !== undefined && stop !== undefined && target !== undefined) {
                const potResult = Math.abs(target - entry) / Math.abs(entry - stop);
                updatedTrade.pot_result = potResult;
              }
              
              // Recalculate result if exit exists
              if (trade.exit !== null && trade.exit !== undefined) {
                const entry = field === 'entry' ? value : trade.entry;
                const stop = field === 'stop' ? value : trade.stop;
                
                if (entry !== undefined && stop !== undefined) {
                  const result = Math.abs(trade.exit - entry) / Math.abs(entry - stop) * (trade.exit > entry ? 1 : -1);
                  updatedTrade.result = result;
                }
              }
            }
            
            if (field === 'exit') {
              if (trade.entry !== undefined && trade.stop !== undefined) {
                const result = Math.abs(value - trade.entry) / Math.abs(trade.entry - trade.stop) * (value > trade.entry ? 1 : -1);
                updatedTrade.result = result;
                
                // Update status based on result
                let status = 'Break Even';
                if (result > 0.1) status = 'Winner';
                else if (result < -0.1) status = 'Expense';
                
                updatedTrade.status = status;
              }
            }
          } else if (['preparation', 'entry_score', 'stop_loss', 'target_score', 'management', 'rules'].includes(field)) {
            // Update the score
            updatedTrade[field] = value;
            
            // Recalculate average
            const scores = [
              field === 'preparation' ? value : trade.preparation,
              field === 'entry_score' ? value : trade.entry_score,
              field === 'stop_loss' ? value : trade.stop_loss,
              field === 'target_score' ? value : trade.target_score,
              field === 'management' ? value : trade.management,
              field === 'rules' ? value : trade.rules
            ].filter(score => score !== null && score !== undefined);
            
            const average = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
            updatedTrade.average = average;
          } else {
            // For other fields, just update directly
            if (field === 'day') {
              // Validate day of week
              const validDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
              if (!validDays.includes(value)) {
                console.warn(`Invalid day: ${value}, ignoring update`);
                return; // Ignore invalid days
              }
            }
            
            // For other fields, just update directly
            updatedTrade[field] = value;
          }
          
          // Save the updated trade
          await tradesStore.setItem(id.toString(), updatedTrade);
          console.log(`Updated trade with ID ${id}`);
          
          // Refresh trades to reflect changes
          fetchTrades();
        });
    } catch (error) {
      console.error('Error updating cell:', error);
      alert(`Error updating cell: ${error.message}`);
    }
  };

  // Create columns array safely
  const getColumns = () => {
    const instrumentOptions = Array.isArray(instruments) 
      ? instruments.map(instrument => ({ value: instrument.id, label: instrument.name }))
      : [];
      
    const entryMethodOptions = Array.isArray(entryMethods)
      ? entryMethods.map(method => ({ value: method.id, label: method.name }))
      : [];
    
    return [
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
        valueOptions: instrumentOptions,
        valueFormatter: (params) => {
          const instrument = Array.isArray(instruments) 
            ? instruments.find(i => i.id === params.value)
            : null;
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
        valueOptions: entryMethodOptions,
        valueFormatter: (params) => {
          const method = Array.isArray(entryMethods) 
            ? entryMethods.find(m => m.id === params.value)
            : null;
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
  };

  return (
    <Box sx={{ height: 'calc(100vh - 300px)', width: '100%' }}>
      {/* Filter Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, display: 'flex', alignItems: 'center' }}>
        <Tabs value={selectedFilter} onChange={handleFilterChange}>
          <Tab label="All Trades" />
          {Array.isArray(filters) && filters.map((filter, index) => (
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
      
      {/* Debug info */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Instruments loaded: {instruments.length}, 
          Entry Methods loaded: {entryMethods.length}, 
          Filters loaded: {Array.isArray(filters) ? filters.length : 0}
        </Typography>
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
          columns={getColumns()}
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