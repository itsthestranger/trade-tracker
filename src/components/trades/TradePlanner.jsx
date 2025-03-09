// src/components/trades/TradePlanner.jsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  CardHeader, 
  Grid, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  TextField, 
  Button, 
  CircularProgress,
  Divider,
  Chip,
  Alert,
  Autocomplete,
  Tooltip
} from '@mui/material';
import { 
  Check as CheckIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon, 
  Save as SaveIcon 
} from '@mui/icons-material';
import { executeQuery, executeNonQuery, getLastInsertId } from '../../services/database/db';
import EntryHeatmap from './EntryHeatmap';
import PlaybookHeatmap from './PlaybookHeatmap';
import { ensureArray, safeMap } from '../../utils/arrayUtils';

const TradePlanner = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Settings
  const [instruments, setInstruments] = useState([]);
  const [confluences, setConfluences] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [minRequiredConfluences, setMinRequiredConfluences] = useState(3);
  
  // Selection state
  const [selectedInstrument, setSelectedInstrument] = useState('');
  const [selectedConfirmationType, setSelectedConfirmationType] = useState('Wick Confirmation');
  const [selectedDirection, setSelectedDirection] = useState('Long');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedSession, setSelectedSession] = useState('ODR');
  const [selectedConfirmationTime, setSelectedConfirmationTime] = useState('');
  
  // Confluences and Body & Mind states
  const [selectedConfluences, setSelectedConfluences] = useState([]);
  const [bodyMindStates, setBodyMindStates] = useState([]);
  
  // Position calculator fields
  const [selectedAccount, setSelectedAccount] = useState('');
  const [accountSize, setAccountSize] = useState(0);
  const [riskPercentage, setRiskPercentage] = useState(1);
  const [stopTicks, setStopTicks] = useState(0);
  const [positionSize, setPositionSize] = useState(0);
  
  // Position details
  const [entryPrice, setEntryPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  
  // Validation flags
  const [hasMinConfluences, setHasMinConfluences] = useState(false);
  
  // Entry times from backtest data
  const [entryTimeData, setEntryTimeData] = useState([]);
  
  // Time options based on selected session
  const [confirmationTimeOptions, setConfirmationTimeOptions] = useState([]);

  const ensureArray = (value) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };
  
  
  useEffect(() => {
    fetchSettings();
  }, []);
  
  useEffect(() => {
    // Generate confirmation time options based on selected session
    if (selectedSession) {
      let timeOptions = [];
      
      if (selectedSession === 'ODR') {
        // 4:00-8:25
        for (let hour = 4; hour <= 8; hour++) {
          for (let minute = 0; minute < 60; minute += 5) {
            if (hour === 8 && minute > 25) break;
            
            const formattedHour = hour.toString().padStart(2, '0');
            const formattedMinute = minute.toString().padStart(2, '0');
            timeOptions.push(`${formattedHour}:${formattedMinute}`);
          }
        }
      } else if (selectedSession === 'RDR') {
        // 10:30-15:55
        for (let hour = 10; hour <= 15; hour++) {
          for (let minute = 0; minute < 60; minute += 5) {
            if (hour === 10 && minute < 30) continue;
            if (hour === 15 && minute > 55) break;
            
            const formattedHour = hour.toString().padStart(2, '0');
            const formattedMinute = minute.toString().padStart(2, '0');
            timeOptions.push(`${formattedHour}:${formattedMinute}`);
          }
        }
      }
      
      setConfirmationTimeOptions(timeOptions);
    }
  }, [selectedSession]);
  
  useEffect(() => {
    // Check if minimum confluences requirement is met
    setHasMinConfluences(selectedConfluences.length >= minRequiredConfluences);
  }, [selectedConfluences, minRequiredConfluences]);
  
  useEffect(() => {
    // Update calculated position size when inputs change
    if (selectedInstrument && stopTicks > 0 && accountSize > 0 && riskPercentage > 0) {
      const instrument = instruments.find(i => i.id === selectedInstrument);
      if (instrument) {
        const calculatedPositionSize = Math.floor((accountSize * (riskPercentage / 100)) / (stopTicks * instrument.tickValue));
        setPositionSize(calculatedPositionSize > 0 ? calculatedPositionSize : 0);
      }
    } else {
      setPositionSize(0);
    }
  }, [selectedInstrument, stopTicks, accountSize, riskPercentage, instruments]);
  
  useEffect(() => {
    // Calculate stop ticks when entry and stop prices change
    if (entryPrice && stopPrice && selectedInstrument) {
      const instrument = instruments.find(i => i.id === selectedInstrument);
      if (instrument) {
        const calculatedStopTicks = Math.abs(parseFloat(entryPrice) - parseFloat(stopPrice)) / instrument.tickValue;
        setStopTicks(isNaN(calculatedStopTicks) ? 0 : Math.round(calculatedStopTicks * 100) / 100);
      }
    }
  }, [entryPrice, stopPrice, selectedInstrument, instruments]);
  
  useEffect(() => {
    // Fetch backtest data when selections change
    if (
      selectedInstrument && 
      selectedConfirmationType && 
      selectedDirection && 
      selectedDay && 
      selectedSession && 
      selectedConfirmationTime
    ) {
      fetchEntryTimes();
    } else {
      setEntryTimeData([]);
    }
  }, [
    selectedInstrument,
    selectedConfirmationType,
    selectedDirection,
    selectedDay,
    selectedSession,
    selectedConfirmationTime
  ]);
  
  useEffect(() => {
    // Set account size when account selection changes
    if (selectedAccount) {
      const account = accounts.find(a => a.id === selectedAccount);
      if (account) {
        setAccountSize(account.size);
        setRiskPercentage(account.percentEqualingOneR);
      }
    }
  }, [selectedAccount, accounts]);
  
  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      
      // Fetch instruments
      const instrumentsResult = executeQuery('SELECT * FROM instruments ORDER BY name');
      // Ensure it's an array
      setInstruments(ensureArray(instrumentsResult));
      
      // Fetch confluences
      const confluencesResult = executeQuery('SELECT * FROM confluences ORDER BY name');
      setConfluences(ensureArray(confluencesResult));
      
      // Fetch accounts
      const accountsResult = executeQuery('SELECT * FROM accounts ORDER BY name');
      setAccounts(ensureArray(accountsResult));
      
      // Fetch minimum required confluences
      const minConfluencesResult = executeQuery("SELECT value FROM app_settings WHERE key = 'minimumConfluencesRequired'");
      
      // Fix: Use ensureArray and check if result has elements
      const safeMinConfluencesResult = ensureArray(minConfluencesResult);
      if (safeMinConfluencesResult.length > 0) {
        setMinRequiredConfluences(parseInt(safeMinConfluencesResult[0].value) || 3);
      } else {
        // Default to 3 if not found
        setMinRequiredConfluences(3);
      }
      
      // Set default selections if available
      const safeInstruments = ensureArray(instrumentsResult);
      if (safeInstruments.length > 0) {
        setSelectedInstrument(safeInstruments[0].id);
      }
      
      const safeAccounts = ensureArray(accountsResult);
      if (safeAccounts.length > 0) {
        setSelectedAccount(safeAccounts[0].id);
        setAccountSize(safeAccounts[0].size);
        setRiskPercentage(safeAccounts[0].percentEqualingOneR);
      }
      
      // Set default day to current weekday (if Mon-Fri)
      const today = new Date();
      const dayNum = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      if (dayNum >= 1 && dayNum <= 5) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        setSelectedDay(days[dayNum]);
      } else {
        setSelectedDay('Mon'); // Default to Monday if weekend
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching settings:', err);
      // Initialize with empty arrays to prevent mapping errors
      setInstruments([]);
      setConfluences([]);
      setAccounts([]);
      setError(err);
      setIsLoading(false);
    }
  };
  
  const fetchEntryTimes = async () => {
    try {
      // Query backtested trades to get entry time patterns
      const entryTimeResult = executeQuery(`
        SELECT 
          entry_time,
          COUNT(*) as count,
          ROUND(AVG(CASE WHEN status = 'Winner' THEN 100 ELSE 0 END), 1) as winrate,
          SUM(result) as total_result
        FROM trades
        WHERE 
          instrument_id = ? AND
          confirmation_type = ? AND
          direction = ? AND
          day = ? AND
          session = ? AND
          confirmation_time = ? AND
          is_backtest = 1
        GROUP BY entry_time
        ORDER BY entry_time
      `, [
        selectedInstrument,
        selectedConfirmationType,
        selectedDirection,
        selectedDay,
        selectedSession,
        selectedConfirmationTime
      ]);
      
      // Ensure we're working with an array
      setEntryTimeData(Array.isArray(entryTimeResult) ? entryTimeResult : []);
    } catch (error) {
      console.error('Error fetching entry times:', error);
      setEntryTimeData([]);
    }
  };
  
  
  const handleConfluenceChange = (event, newValue) => {
    setSelectedConfluences(newValue);
  };
  
  const handleBodyMindChange = (event, newValue) => {
    setBodyMindStates(newValue);
  };
  
  const handleAccountSizeChange = (e) => {
    const value = parseFloat(e.target.value);
    setAccountSize(isNaN(value) ? 0 : value);
  };
  
  const handleRiskPercentageChange = (e) => {
    const value = parseFloat(e.target.value);
    setRiskPercentage(isNaN(value) ? 0 : value);
  };
  
  const handleStopTicksChange = (e) => {
    const value = parseFloat(e.target.value);
    setStopTicks(isNaN(value) ? 0 : value);
  };
  
  const handleSaveTrade = (isExecuted) => {
    try {
      if (!selectedInstrument || !entryPrice || !stopPrice || !targetPrice) {
        alert('Please fill in all required fields: Instrument, Entry, Stop, and Target prices.');
        return;
      }
      
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const timeStr = selectedConfirmationTime || today.toTimeString().substring(0, 5);
      
      // Create trade record
      const success = executeNonQuery(`
        INSERT INTO trades (
          date, 
          day, 
          confirmation_time, 
          entry_time, 
          instrument_id, 
          confirmation_type, 
          direction, 
          session, 
          entry_method_id, 
          stopped_out, 
          status, 
          entry, 
          stop, 
          target, 
          stop_ticks,
          pot_result,
          is_backtest, 
          is_planned
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        dateStr,
        selectedDay,
        selectedConfirmationTime,
        timeStr, // Entry time (same as confirmation time for now)
        selectedInstrument,
        selectedConfirmationType,
        selectedDirection,
        selectedSession,
        null, // Entry method ID (null for now)
        0, // Stopped out (false)
        'Winner', // Default status
        parseFloat(entryPrice),
        parseFloat(stopPrice),
        parseFloat(targetPrice),
        stopTicks,
        Math.abs(parseFloat(targetPrice) - parseFloat(entryPrice)) / Math.abs(parseFloat(entryPrice) - parseFloat(stopPrice)),
        0, // Is backtest (false)
        isExecuted ? 0 : 1 // Is planned (based on save type)
      ]);
      
      if (!success) {
        console.error("Failed to insert trade record");
        alert("Failed to save trade. Please check console for errors.");
        return;
      }
      
      // Get the new trade ID
      const newTradeIdResult = executeQuery("SELECT last_insert_rowid() as id");
      let newTradeId;
      
      if (Array.isArray(newTradeIdResult) && newTradeIdResult.length > 0) {
        newTradeId = newTradeIdResult[0].id;
      } else {
        console.error("Failed to get last insert ID");
        alert("Trade was saved but confluences couldn't be linked.");
        return;
      }
      
      // Save confluences
      if (selectedConfluences.length > 0) {
        let allConflSaved = true;
        for (const confluenceId of selectedConfluences) {
          const conflSaved = executeNonQuery(`
            INSERT INTO trade_confluences (trade_id, confluence_id)
            VALUES (?, ?)
          `, [newTradeId, confluenceId]);
          
          if (!conflSaved) {
            allConflSaved = false;
            console.error(`Failed to save confluence ${confluenceId} for trade ${newTradeId}`);
          }
        }
        
        if (!allConflSaved) {
          alert("Some confluences couldn't be saved with the trade.");
        }
      }
      
      // Save body & mind state
      if (bodyMindStates.length > 0) {
        const journalSaved = executeNonQuery(`
          INSERT INTO trade_journal (trade_id, body_mind_state)
          VALUES (?, ?)
        `, [newTradeId, bodyMindStates.join(',')]);
        
        if (!journalSaved) {
          console.error(`Failed to save body & mind state for trade ${newTradeId}`);
          alert("Trade was saved but body & mind state couldn't be saved.");
        }
      }
      
      // Clear form
      setEntryPrice('');
      setStopPrice('');
      setTargetPrice('');
      
      // Show success message
      alert(`Trade ${isExecuted ? 'executed' : 'planned'} successfully!`);
      
    } catch (error) {
      console.error('Error saving trade:', error);
      alert('Failed to save trade: ' + (error.message || 'Unknown error'));
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
  
  // Check if we need to prompt for setup
  const needsSetup = instruments.length === 0 || accounts.length === 0;
  
  if (needsSetup) {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="h6">Setup Required</Typography>
            <Typography variant="body1">
              Before using the Trade Planner, you need to set up:
            </Typography>
            <ul>
              {instruments.length === 0 && <li>Instruments in Settings</li>}
              {accounts.length === 0 && <li>Trading Accounts in Settings</li>}
            </ul>
          </Alert>
          <Typography>
            Please go to the Settings page to configure your trading parameters.
          </Typography>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Trade Planner
      </Typography>
      
      <Grid container spacing={3}>
        {/* Left column - Selections and Confluences */}
        <Grid item xs={12} md={6}>
          {/* Trade Setup Card */}
          <Card sx={{ mb: 3 }}>
            <CardHeader title="Trade Setup" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="instrument-label">Instrument</InputLabel>
                  <Select
                    labelId="instrument-label"
                    value={selectedInstrument}
                    label="Instrument"
                    onChange={(e) => setSelectedInstrument(e.target.value)}
                  >
                    {Array.isArray(instruments) ? (
                      ensureArray(instruments).map((instrument) => (
                        <MenuItem key={instrument.id} value={instrument.id}>
                          {instrument.name}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled>No instruments available</MenuItem>
                    )}
                  </Select>
                </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="confirmation-type-label">Confirmation Type</InputLabel>
                    <Select
                      labelId="confirmation-type-label"
                      value={selectedConfirmationType}
                      label="Confirmation Type"
                      onChange={(e) => setSelectedConfirmationType(e.target.value)}
                    >
                      <MenuItem value="Wick Confirmation">Wick Confirmation</MenuItem>
                      <MenuItem value="Full Confirmation">Full Confirmation</MenuItem>
                      <MenuItem value="Early Indication">Early Indication</MenuItem>
                      <MenuItem value="No Confirmation">No Confirmation</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="direction-label">Direction</InputLabel>
                    <Select
                      labelId="direction-label"
                      value={selectedDirection}
                      label="Direction"
                      onChange={(e) => setSelectedDirection(e.target.value)}
                    >
                      <MenuItem value="Long">Long</MenuItem>
                      <MenuItem value="Short">Short</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="day-label">Day</InputLabel>
                    <Select
                      labelId="day-label"
                      value={selectedDay}
                      label="Day"
                      onChange={(e) => setSelectedDay(e.target.value)}
                    >
                      <MenuItem value="Mon">Monday</MenuItem>
                      <MenuItem value="Tue">Tuesday</MenuItem>
                      <MenuItem value="Wed">Wednesday</MenuItem>
                      <MenuItem value="Thu">Thursday</MenuItem>
                      <MenuItem value="Fri">Friday</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="session-label">Session</InputLabel>
                    <Select
                      labelId="session-label"
                      value={selectedSession}
                      label="Session"
                      onChange={(e) => setSelectedSession(e.target.value)}
                    >
                      <MenuItem value="ODR">ODR (4:00–8:25)</MenuItem>
                      <MenuItem value="RDR">RDR (10:30–15:55)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="confirmation-time-label">Confirmation Candle</InputLabel>
                    <Select
                      labelId="confirmation-time-label"
                      value={selectedConfirmationTime}
                      label="Confirmation Candle"
                      onChange={(e) => setSelectedConfirmationTime(e.target.value)}
                    >
                      {confirmationTimeOptions.map((time) => (
                        <MenuItem key={time} value={time}>{time}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          
          {/* Confluences Card */}
          <Card sx={{ mb: 3 }}>
            <CardHeader 
              title="Confluences Checklist" 
              subheader={`Minimum required: ${minRequiredConfluences}`}
              action={
                hasMinConfluences ? 
                <Tooltip title="Minimum confluences met">
                  <CheckCircleIcon color="success" sx={{ mr: 2 }} />
                </Tooltip> : 
                <Tooltip title="Need more confluences">
                  <CancelIcon color="error" sx={{ mr: 2 }} />
                </Tooltip>
              }
            />
            <CardContent>
              <Autocomplete
                multiple
                id="confluences-selector"
                options={Array.isArray(confluences) ? confluences : []}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={Array.isArray(confluences) ? confluences.filter(c => selectedConfluences.includes(c.id)) : []}
                onChange={(event, newValue) => {
                  setSelectedConfluences(newValue.map(item => item.id));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    label="Select Confluences"
                    placeholder="Confluences"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option.name}
                      {...getTagProps({ index })}
                      color={selectedConfluences.length >= minRequiredConfluences ? "primary" : "default"}
                    />
                  ))
                }
              />
            </CardContent>
          </Card>
          
          {/* Body & Mind Check */}
          <Card>
            <CardHeader title="Body & Mind Check" />
            <CardContent>
              <Autocomplete
                multiple
                id="body-mind-selector"
                options={[
                  'Alcohol', 'Bad Sleep', 'Calm', 'Fit', 'Good Sleep', 'Gym', 
                  'Impatient', 'Meditation', 'Nervous', 'Physical Exercise', 
                  'Stressed', 'Tired', 'Sick'
                ]}
                value={bodyMindStates}
                onChange={handleBodyMindChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    label="Body & Mind State"
                    placeholder="Select states"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option}
                      {...getTagProps({ index })}
                    />
                  ))
                }
              />
            </CardContent>
          </Card>
        </Grid>
        
        {/* Right column - Heatmaps and Position Calculator */}
        <Grid item xs={12} md={6}>
          {/* Entry Heatmap */}
          <Card sx={{ mb: 3 }}>
            <CardHeader title="Entry Timings" />
            <CardContent>
            {entryTimeData.length > 0 ? (
              <EntryHeatmap 
                entryTimeData={Array.isArray(entryTimeData) ? entryTimeData : []} 
                session={selectedSession} 
              />
            ) : (
              <Typography variant="body2" color="text.secondary" align="center">
                No entry time data available for the selected criteria.
                Complete all selections above to see backtest data.
              </Typography>
            )}
            </CardContent>
          </Card>
          
          {/* Playbook Heatmap - Placeholder */}
          <Card sx={{ mb: 3 }}>
            <CardHeader title="Playbook Heatmap" />
            <CardContent>
            {selectedInstrument && selectedDay && selectedConfirmationTime ? (
              <PlaybookHeatmap 
                instrumentId={selectedInstrument}
                day={selectedDay}
                direction={selectedDirection}
                confirmationTime={selectedConfirmationTime}
              />
            ) : (
              <Typography variant="body2" color="text.secondary" align="center">
                Complete all selections to see playbook data.
              </Typography>
            )}
            </CardContent>
          </Card>
          
          {/* Position Size Calculator */}
          <Card sx={{ mb: 3 }}>
            <CardHeader title="Position Size Calculator" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="account-label">Account</InputLabel>
                  <Select
                    labelId="account-label"
                    value={selectedAccount}
                    label="Account"
                    onChange={(e) => setSelectedAccount(e.target.value)}
                  >
                    {Array.isArray(accounts) ? (
                      ensureArray(accounts).map((account) => (
                        <MenuItem key={account.id} value={account.id}>
                          {account.name}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled>No accounts available</MenuItem>
                    )}
                  </Select>
                </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Account Size"
                    type="number"
                    value={accountSize}
                    onChange={handleAccountSizeChange}
                    InputProps={{
                      startAdornment: <Typography color="text.secondary" sx={{ mr: 1 }}>$</Typography>,
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Risk %"
                    type="number"
                    value={riskPercentage}
                    onChange={handleRiskPercentageChange}
                    InputProps={{
                      endAdornment: <Typography color="text.secondary" sx={{ ml: 1 }}>%</Typography>,
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Stop Ticks"
                    type="number"
                    value={stopTicks}
                    onChange={handleStopTicksChange}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1">
                      Position Size:
                    </Typography>
                    <Typography variant="h5" color="primary.main">
                      {positionSize > 0 ? positionSize : 0} contracts
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          
          {/* Position Details */}
          <Card>
            <CardHeader title="Position Details" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Entry"
                    type="number"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                  />
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Stop"
                    type="number"
                    value={stopPrice}
                    onChange={(e) => setStopPrice(e.target.value)}
                  />
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Target"
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                  />
                </Grid>
                
                <Grid item xs={12} display="flex" gap={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<SaveIcon />}
                    onClick={() => handleSaveTrade(false)}
                    disabled={!selectedInstrument || !entryPrice || !stopPrice || !targetPrice}
                  >
                    Save as Planned
                  </Button>
                  
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<CheckIcon />}
                    onClick={() => handleSaveTrade(true)}
                    disabled={!selectedInstrument || !entryPrice || !stopPrice || !targetPrice || !hasMinConfluences}
                  >
                    Save as Executed
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TradePlanner;