// src/pages/Settings.jsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, CircularProgress } from '@mui/material';
import InstrumentsSettings from '../components/settings/InstrumentsSettings';
import EntryMethodsSettings from '../components/settings/EntryMethodsSettings';
import AccountsSettings from '../components/settings/AccountsSettings';
import ConfluencesSettings from '../components/settings/ConfluencesSettings';
import { executeQuery } from '../services/database/db';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

const Settings = () => {
  const [tabValue, setTabValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [instruments, setInstruments] = useState([]);
  const [entryMethods, setEntryMethods] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [confluences, setConfluences] = useState([]);
  const [minRequiredConfluences, setMinRequiredConfluences] = useState(3);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        
        // Fetch instruments
        const instrumentsData = executeQuery('SELECT * FROM instruments ORDER BY name');
        setInstruments(Array.isArray(instrumentsData) ? instrumentsData : []);
        
        // Fetch entry methods
        const entryMethodsData = executeQuery('SELECT * FROM entry_methods ORDER BY name');
        setEntryMethods(Array.isArray(entryMethodsData) ? entryMethodsData : []);
        
        // Fetch accounts
        const accountsData = executeQuery('SELECT * FROM accounts ORDER BY name');
        setAccounts(Array.isArray(accountsData) ? accountsData : []);
        
        // Fetch confluences
        const confluencesData = executeQuery('SELECT * FROM confluences ORDER BY name');
        setConfluences(Array.isArray(confluencesData) ? confluencesData : []);
        
        // Fetch minimum confluences required
        const minConfluencesData = executeQuery("SELECT value FROM app_settings WHERE key = 'minimumConfluencesRequired'");
        if (Array.isArray(minConfluencesData) && minConfluencesData.length > 0) {
          setMinRequiredConfluences(parseInt(minConfluencesData[0].value) || 3);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching settings:', err);
        setError(err);
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleDataUpdate = (type) => {
    // Refresh data when updates occur
    try {
      switch (type) {
        case 'instruments':
          const instrumentsData = executeQuery('SELECT * FROM instruments ORDER BY name');
          setInstruments(Array.isArray(instrumentsData) ? instrumentsData : []);
          break;
        case 'entryMethods':
          const entryMethodsData = executeQuery('SELECT * FROM entry_methods ORDER BY name');
          setEntryMethods(Array.isArray(entryMethodsData) ? entryMethodsData : []);
          break;
        case 'accounts':
          const accountsData = executeQuery('SELECT * FROM accounts ORDER BY name');
          setAccounts(Array.isArray(accountsData) ? accountsData : []);
          break;
        case 'confluences':
          const confluencesData = executeQuery('SELECT * FROM confluences ORDER BY name');
          setConfluences(Array.isArray(confluencesData) ? confluencesData : []);
          break;
        case 'minConfluences':
          const minConfluencesData = executeQuery("SELECT value FROM app_settings WHERE key = 'minimumConfluencesRequired'");
          if (Array.isArray(minConfluencesData) && minConfluencesData.length > 0) {
            setMinRequiredConfluences(parseInt(minConfluencesData[0].value) || 3);
          }
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error updating data:', error);
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
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
          <Tab label="Instruments" {...a11yProps(0)} />
          <Tab label="Entry Methods" {...a11yProps(1)} />
          <Tab label="Accounts" {...a11yProps(2)} />
          <Tab label="Confluences" {...a11yProps(3)} />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <InstrumentsSettings 
          instruments={instruments} 
          onUpdate={() => handleDataUpdate('instruments')} 
        />
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <EntryMethodsSettings 
          entryMethods={entryMethods} 
          onUpdate={() => handleDataUpdate('entryMethods')} 
        />
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        <AccountsSettings 
          accounts={accounts} 
          onUpdate={() => handleDataUpdate('accounts')} 
        />
      </TabPanel>
      
      <TabPanel value={tabValue} index={3}>
        <ConfluencesSettings 
          confluences={confluences} 
          minConfluences={minRequiredConfluences}
          onUpdate={(type) => handleDataUpdate(type)} 
        />
      </TabPanel>
    </Box>
  );
};

export default Settings;