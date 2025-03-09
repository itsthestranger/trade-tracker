// src/pages/Settings.jsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, CircularProgress, Divider } from '@mui/material';
import InstrumentsSettings from '../components/settings/InstrumentsSettings';
import EntryMethodsSettings from '../components/settings/EntryMethodsSettings';
import AccountsSettings from '../components/settings/AccountsSettings';
import ConfluencesSettings from '../components/settings/ConfluencesSettings';
import DatabaseTools from '../components/settings/DatabaseTools';
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
    fetchSettings();
  }, []);
  
  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch instruments
      const instrumentsResult = executeQuery('SELECT * FROM instruments ORDER BY name');
      setInstruments(instrumentsResult || []);
      
      // Fetch entry methods
      const entryMethodsResult = executeQuery('SELECT * FROM entry_methods ORDER BY name');
      setEntryMethods(entryMethodsResult || []);
      
      // Fetch accounts
      const accountsResult = executeQuery('SELECT * FROM accounts ORDER BY name');
      setAccounts(accountsResult || []);
      
      // Fetch confluences
      const confluencesResult = executeQuery('SELECT * FROM confluences ORDER BY name');
      setConfluences(confluencesResult || []);
      
      // Fetch minimum required confluences
      const minConfluencesResult = executeQuery("SELECT value FROM app_settings WHERE key = 'minimumConfluencesRequired'");
      
      if (Array.isArray(minConfluencesResult) && minConfluencesResult.length > 0) {
        setMinRequiredConfluences(parseInt(minConfluencesResult[0].value) || 3);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(err);
      setIsLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleDataUpdate = (type) => {
    fetchSettings();
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
          Error: {error.message || "An error occurred while loading settings"}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      {/* Database Tools Section */}
      <Box sx={{ mb: 4 }}>
        <DatabaseTools />
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
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