// src/components/backtest/FilterDialog.jsx
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
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Checkbox, 
  ListItemText,
  FormControlLabel,
  Switch,
  Slider,
  Chip,
  OutlinedInput,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  FilterAlt as FilterIcon
} from '@mui/icons-material';
import { executeQuery, executeNonQuery, getLastInsertId } from '../../services/database/db';
import { ensureArray, safeMap } from '../../utils/arrayUtils';

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

const FilterDialog = ({ open, onClose, type, instruments, entryMethods }) => {
  const [filters, setFilters] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [filterName, setFilterName] = useState('');
  const [filterMode, setFilterMode] = useState('new'); // 'new', 'edit'
  const [error, setError] = useState('');
  
  // Filter criteria
  const [dateRange, setDateRange] = useState([null, null]);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [selectedInstruments, setSelectedInstruments] = useState([]);
  const [selectedEntryMethods, setSelectedEntryMethods] = useState([]);
  const [metricsRange, setMetricsRange] = useState([1, 10]);
  const [selectedConfluences, setSelectedConfluences] = useState([]);
  const [confluenceLogic, setConfluenceLogic] = useState('AND');
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedDirections, setSelectedDirections] = useState([]);
  const [selectedConfirmationTypes, setSelectedConfirmationTypes] = useState([]);
  const [stopTicksRange, setStopTicksRange] = useState([0, 100]);
  const [confluences, setConfluences] = useState([]);
  
  useEffect(() => {
    fetchFilters();
    fetchConfluences();
  }, [type]);
  
  const fetchFilters = () => {
    try {
      const results = executeQuery(
        `SELECT * FROM filters WHERE type = ? ORDER BY name`,
        [type]
      );
      setFilters(results);
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };
  
  const fetchConfluences = () => {
    try {
      const results = executeQuery(`SELECT * FROM confluences ORDER BY name`);
      setConfluences(results);
    } catch (error) {
      console.error('Error fetching confluences:', error);
    }
  };
  
  const handleFilterSelect = (filter) => {
    setSelectedFilter(filter);
    setFilterName(filter.name);
    setFilterMode('edit');
    
    // Parse filter criteria
    const criteria = JSON.parse(filter.criteria);
    
    // Set filter fields from criteria
    setDateRange([criteria.date_from || null, criteria.date_to || null]);
    setSelectedSessions(criteria.sessions || []);
    setSelectedInstruments(criteria.instruments || []);
    setSelectedEntryMethods(criteria.entry_methods || []);
    setMetricsRange(criteria.metrics_range || [1, 10]);
    setSelectedConfluences(criteria.confluences || []);
    setConfluenceLogic(criteria.confluence_logic || 'AND');
    setSelectedStatuses(criteria.statuses || []);
    setSelectedDays(criteria.days || []);
    setSelectedDirections(criteria.directions || []);
    setSelectedConfirmationTypes(criteria.confirmation_types || []);
    setStopTicksRange(criteria.stop_ticks_range || [0, 100]);
  };
  
  const handleNewFilter = () => {
    setSelectedFilter(null);
    setFilterName('');
    setFilterMode('new');
    resetFilterCriteria();
  };
  
  const resetFilterCriteria = () => {
    setDateRange([null, null]);
    setSelectedSessions([]);
    setSelectedInstruments([]);
    setSelectedEntryMethods([]);
    setMetricsRange([1, 10]);
    setSelectedConfluences([]);
    setConfluenceLogic('AND');
    setSelectedStatuses([]);
    setSelectedDays([]);
    setSelectedDirections([]);
    setSelectedConfirmationTypes([]);
    setStopTicksRange([0, 100]);
  };
  
  const handleDeleteFilter = (filterId) => {
    try {
      executeNonQuery('DELETE FROM filters WHERE id = ?', [filterId]);
      fetchFilters();
      
      if (selectedFilter && selectedFilter.id === filterId) {
        handleNewFilter();
      }
    } catch (error) {
      console.error('Error deleting filter:', error);
    }
  };
  
  const handleSaveFilter = () => {
    if (!filterName.trim()) {
      setError('Filter name is required');
      return;
    }
    
    try {
      // Prepare filter criteria
      const criteria = {
        date_from: dateRange[0],
        date_to: dateRange[1],
        sessions: selectedSessions.length > 0 ? selectedSessions : null,
        instruments: selectedInstruments.length > 0 ? selectedInstruments : null,
        entry_methods: selectedEntryMethods.length > 0 ? selectedEntryMethods : null,
        metrics_range: metricsRange,
        confluences: selectedConfluences.length > 0 ? selectedConfluences : null,
        confluence_logic: confluenceLogic,
        statuses: selectedStatuses.length > 0 ? selectedStatuses : null,
        days: selectedDays.length > 0 ? selectedDays : null,
        directions: selectedDirections.length > 0 ? selectedDirections : null,
        confirmation_types: selectedConfirmationTypes.length > 0 ? selectedConfirmationTypes : null,
        stop_ticks_range: stopTicksRange
      };
      
      if (filterMode === 'edit' && selectedFilter) {
        // Update existing filter
        executeNonQuery(
          'UPDATE filters SET name = ?, criteria = ? WHERE id = ?',
          [filterName.trim(), JSON.stringify(criteria), selectedFilter.id]
        );
      } else {
        // Create new filter
        executeNonQuery(
          'INSERT INTO filters (name, criteria, type) VALUES (?, ?, ?)',
          [filterName.trim(), JSON.stringify(criteria), type]
        );
      }
      
      fetchFilters();
      handleNewFilter();
      setError('');
    } catch (error) {
      console.error('Error saving filter:', error);
      setError('Failed to save filter: ' + error.message);
    }
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Manage Filters</DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          {/* Left side - Filter List */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">Saved Filters</Typography>
              <Button 
                variant="outlined" 
                startIcon={<AddIcon />} 
                onClick={handleNewFilter}
                size="small"
              >
                New
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <List>
              {ensureArray(filters).map((filter) => (
                <ListItem 
                  key={filter.id}
                  disablePadding
                  secondaryAction={
                    <IconButton 
                      edge="end" 
                      aria-label="delete"
                      onClick={() => handleDeleteFilter(filter.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemButton 
                    selected={selectedFilter && selectedFilter.id === filter.id}
                    onClick={() => handleFilterSelect(filter)}
                  >
                    <ListItemIcon>
                      <FilterIcon />
                    </ListItemIcon>
                    <ListItemText primary={filter.name} />
                  </ListItemButton>
                </ListItem>
              ))}
              {filters.length === 0 && (
                <ListItem>
                  <ListItemText 
                    primary="No saved filters" 
                    secondary="Create a new filter to get started."
                  />
                </ListItem>
              )}
            </List>
          </Grid>
          
          {/* Right side - Filter Editor */}
          <Grid item xs={12} md={8}>
            <Box sx={{ p: 1 }}>
              <TextField
                fullWidth
                label="Filter Name"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                error={!!error}
                helperText={error}
                margin="normal"
              />
              
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                Filter Criteria
              </Typography>
              
              {/* Date Range */}
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Date Range</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        label="From Date"
                        type="date"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        value={dateRange[0] || ''}
                        onChange={(e) => setDateRange([e.target.value, dateRange[1]])}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="To Date"
                        type="date"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        value={dateRange[1] || ''}
                        onChange={(e) => setDateRange([dateRange[0], e.target.value])}
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
              
              {/* Session */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Session</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <FormControl fullWidth>
                    <InputLabel id="sessions-label">Sessions</InputLabel>
                    <Select
                      labelId="sessions-label"
                      id="sessions"
                      multiple
                      value={selectedSessions}
                      onChange={(e) => setSelectedSessions(e.target.value)}
                      input={<OutlinedInput label="Sessions" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {ensureArray(selected).map((value) => (
                            <Chip key={value} label={value} />
                          ))}
                        </Box>
                      )}
                      MenuProps={MenuProps}
                    >
                      <MenuItem value="ODR">
                        <Checkbox checked={selectedSessions.indexOf("ODR") > -1} />
                        <ListItemText primary="ODR" />
                      </MenuItem>
                      <MenuItem value="RDR">
                        <Checkbox checked={selectedSessions.indexOf("RDR") > -1} />
                        <ListItemText primary="RDR" />
                      </MenuItem>
                    </Select>
                  </FormControl>
                </AccordionDetails>
              </Accordion>
              
              {/* Instruments */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Instruments</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <FormControl fullWidth>
                    <InputLabel id="instruments-label">Instruments</InputLabel>
                    <Select
                      labelId="instruments-label"
                      id="instruments"
                      multiple
                      value={selectedInstruments}
                      onChange={(e) => setSelectedInstruments(e.target.value)}
                      input={<OutlinedInput label="Instruments" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {ensureArray(selected).map((value) => {
                            const instrument = instruments.find(i => i.id === value);
                            return (
                              <Chip key={value} label={instrument ? instrument.name : value} />
                            );
                          })}
                        </Box>
                      )}
                      MenuProps={MenuProps}
                    >
                      {ensureArray(instruments).map((instrument) => (
                        <MenuItem key={instrument.id} value={instrument.id}>
                          <Checkbox checked={selectedInstruments.indexOf(instrument.id) > -1} />
                          <ListItemText primary={instrument.name} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </AccordionDetails>
              </Accordion>
              
              {/* Entry Methods */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Entry Methods</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <FormControl fullWidth>
                    <InputLabel id="entry-methods-label">Entry Methods</InputLabel>
                    <Select
                      labelId="entry-methods-label"
                      id="entry-methods"
                      multiple
                      value={selectedEntryMethods}
                      onChange={(e) => setSelectedEntryMethods(e.target.value)}
                      input={<OutlinedInput label="Entry Methods" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {ensureArray(selected).map((value) => {
                            const method = entryMethods.find(m => m.id === value);
                            return (
                              <Chip key={value} label={method ? method.name : value} />
                            );
                          })}
                        </Box>
                      )}
                      MenuProps={MenuProps}
                    >
                      {ensureArray(entryMethods).map((method) => (
                        <MenuItem key={method.id} value={method.id}>
                          <Checkbox checked={selectedEntryMethods.indexOf(method.id) > -1} />
                          <ListItemText primary={method.name} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </AccordionDetails>
              </Accordion>
              
              {/* Average Metrics */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Average Metrics</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ px: 2 }}>
                    <Typography id="metrics-slider-label" gutterBottom>
                      Average Metrics Range: {metricsRange[0]} - {metricsRange[1]}
                    </Typography>
                    <Slider
                      value={metricsRange}
                      onChange={(e, newValue) => setMetricsRange(newValue)}
                      valueLabelDisplay="auto"
                      min={1}
                      max={10}
                      step={0.5}
                      marks={[
                        { value: 1, label: '1' },
                        { value: 5, label: '5' },
                        { value: 10, label: '10' }
                      ]}
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>
              
              {/* Confluences */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Confluences</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <FormControl component="fieldset" sx={{ mb: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={confluenceLogic === 'AND'}
                          onChange={(e) => setConfluenceLogic(e.target.checked ? 'AND' : 'OR')}
                        />
                      }
                      label={confluenceLogic === 'AND' ? 'Match ALL selected (AND)' : 'Match ANY selected (OR)'}
                    />
                  </FormControl>
                  
                  <FormControl fullWidth>
                    <InputLabel id="confluences-label">Confluences</InputLabel>
                    <Select
                      labelId="confluences-label"
                      id="confluences"
                      multiple
                      value={selectedConfluences}
                      onChange={(e) => setSelectedConfluences(e.target.value)}
                      input={<OutlinedInput label="Confluences" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {ensureArray(selected).map((value) => {
                            const confluence = confluences.find(c => c.id === value);
                            return (
                              <Chip key={value} label={confluence ? confluence.name : value} />
                            );
                          })}
                        </Box>
                      )}
                      MenuProps={MenuProps}
                    >
                      {ensureArray(confluences).map((confluence) => (
                        <MenuItem key={confluence.id} value={confluence.id}>
                          <Checkbox checked={selectedConfluences.indexOf(confluence.id) > -1} />
                          <ListItemText primary={confluence.name} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </AccordionDetails>
              </Accordion>
              
              {/* Status */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Status</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <FormControl fullWidth>
                    <InputLabel id="statuses-label">Statuses</InputLabel>
                    <Select
                      labelId="statuses-label"
                      id="statuses"
                      multiple
                      value={selectedStatuses}
                      onChange={(e) => setSelectedStatuses(e.target.value)}
                      input={<OutlinedInput label="Statuses" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {ensureArray(selected).map((value) => (
                            <Chip key={value} label={value} />
                          ))}
                        </Box>
                      )}
                      MenuProps={MenuProps}
                    >
                      <MenuItem value="Winner">
                        <Checkbox checked={selectedStatuses.indexOf("Winner") > -1} />
                        <ListItemText primary="Winner" />
                      </MenuItem>
                      <MenuItem value="Expense">
                        <Checkbox checked={selectedStatuses.indexOf("Expense") > -1} />
                        <ListItemText primary="Expense" />
                      </MenuItem>
                      <MenuItem value="Break Even">
                        <Checkbox checked={selectedStatuses.indexOf("Break Even") > -1} />
                        <ListItemText primary="Break Even" />
                      </MenuItem>
                    </Select>
                  </FormControl>
                </AccordionDetails>
              </Accordion>
              
              {/* Days */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Days</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <FormControl fullWidth>
                    <InputLabel id="days-label">Days</InputLabel>
                    <Select
                      labelId="days-label"
                      id="days"
                      multiple
                      value={selectedDays}
                      onChange={(e) => setSelectedDays(e.target.value)}
                      input={<OutlinedInput label="Days" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {ensureArray(selected).map((value) => (
                            <Chip key={value} label={value} />
                          ))}
                        </Box>
                      )}
                      MenuProps={MenuProps}
                    >
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => (
                        <MenuItem key={day} value={day}>
                          <Checkbox checked={selectedDays.indexOf(day) > -1} />
                          <ListItemText primary={day} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </AccordionDetails>
              </Accordion>
              
              {/* Direction */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Direction</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <FormControl fullWidth>
                    <InputLabel id="directions-label">Directions</InputLabel>
                    <Select
                      labelId="directions-label"
                      id="directions"
                      multiple
                      value={selectedDirections}
                      onChange={(e) => setSelectedDirections(e.target.value)}
                      input={<OutlinedInput label="Directions" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {ensureArray(selected).map((value) => (
                            <Chip key={value} label={value} />
                          ))}
                        </Box>
                      )}
                      MenuProps={MenuProps}
                    >
                      <MenuItem value="Long">
                        <Checkbox checked={selectedDirections.indexOf("Long") > -1} />
                        <ListItemText primary="Long" />
                      </MenuItem>
                      <MenuItem value="Short">
                        <Checkbox checked={selectedDirections.indexOf("Short") > -1} />
                        <ListItemText primary="Short" />
                      </MenuItem>
                    </Select>
                  </FormControl>
                </AccordionDetails>
              </Accordion>
              
              {/* Confirmation Type */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Confirmation Type</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <FormControl fullWidth>
                    <InputLabel id="confirmation-types-label">Confirmation Types</InputLabel>
                    <Select
                      labelId="confirmation-types-label"
                      id="confirmation-types"
                      multiple
                      value={selectedConfirmationTypes}
                      onChange={(e) => setSelectedConfirmationTypes(e.target.value)}
                      input={<OutlinedInput label="Confirmation Types" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {ensureArray(selected).map((value) => (
                            <Chip key={value} label={value} />
                          ))}
                        </Box>
                      )}
                      MenuProps={MenuProps}
                    >
                      <MenuItem value="Wick Confirmation">
                        <Checkbox checked={selectedConfirmationTypes.indexOf("Wick Confirmation") > -1} />
                        <ListItemText primary="Wick Confirmation" />
                      </MenuItem>
                      <MenuItem value="Full Confirmation">
                        <Checkbox checked={selectedConfirmationTypes.indexOf("Full Confirmation") > -1} />
                        <ListItemText primary="Full Confirmation" />
                      </MenuItem>
                      <MenuItem value="Early Indication">
                        <Checkbox checked={selectedConfirmationTypes.indexOf("Early Indication") > -1} />
                        <ListItemText primary="Early Indication" />
                      </MenuItem>
                      <MenuItem value="No Confirmation">
                        <Checkbox checked={selectedConfirmationTypes.indexOf("No Confirmation") > -1} />
                        <ListItemText primary="No Confirmation" />
                      </MenuItem>
                    </Select>
                  </FormControl>
                </AccordionDetails>
              </Accordion>
              
              {/* Stop Ticks */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Stop Ticks</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ px: 2 }}>
                    <Typography id="stop-ticks-slider-label" gutterBottom>
                      Stop Ticks Range: {stopTicksRange[0]} - {stopTicksRange[1]}
                    </Typography>
                    <Slider
                      value={stopTicksRange}
                      onChange={(e, newValue) => setStopTicksRange(newValue)}
                      valueLabelDisplay="auto"
                      min={0}
                      max={100}
                      step={1}
                      marks={[
                        { value: 0, label: '0' },
                        { value: 50, label: '50' },
                        { value: 100, label: '100' }
                      ]}
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSaveFilter} variant="contained" color="primary">
          Save Filter
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FilterDialog;