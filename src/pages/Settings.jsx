// src/pages/Settings.jsx - Updated to use direct localforage instead of executeQuery
import React, { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, CircularProgress } from '@mui/material';
import InstrumentsSettings from '../components/settings/InstrumentsSettings';
import EntryMethodsSettings from '../components/settings/EntryMethodsSettings';
import AccountsSettings from '../components/settings/AccountsSettings';
import ConfluencesSettings from '../components/settings/ConfluencesSettings';
import { executeQuery } from '../services/database/db';

// Direct access to localforage for more reliable data fetching
import localforage from 'localforage';

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

  // Fetch data directly from localforage stores
  const fetchDataDirect = async () => {
    try {
      console.log("Fetching data directly from localforage...");
      setIsLoading(true);
      
      // Fetch instruments directly
      const instrumentsStore = localforage.createInstance({ name: 'instruments' });
      const instrumentsData = [];
      await instrumentsStore.iterate((value, key) => {
        instrumentsData.push(value);
      });
      console.log("Direct instruments fetch:", instrumentsData);
      setInstruments(instrumentsData);
      
      // Fetch entry methods directly
      const entryMethodsStore = localforage.createInstance({ name: 'entry_methods' });
      const entryMethodsData = [];
      await entryMethodsStore.iterate((value, key) => {
        entryMethodsData.push(value);
      });
      setEntryMethods(entryMethodsData);
      
      // Fetch accounts directly
      const accountsStore = localforage.createInstance({ name: 'accounts' });
      const accountsData = [];
      await accountsStore.iterate((value, key) => {
        accountsData.push(value);
      });
      setAccounts(accountsData);
      
      // Fetch confluences directly
      const confluencesStore = localforage.createInstance({ name: 'confluences' });
      const confluencesData = [];
      await confluencesStore.iterate((value, key) => {
        confluencesData.push(value);
      });
      setConfluences(confluencesData);
      
      // Fetch minimum confluences required
      const appSettingsStore = localforage.createInstance({ name: 'app_settings' });
      let minConfluencesValue = 3;
      await appSettingsStore.iterate((value, key) => {
        if (value.key === 'minimumConfluencesRequired') {
          minConfluencesValue = parseInt(value.value) || 3;
        }
      });
      setMinRequiredConfluences(minConfluencesValue);
      
      setIsLoading(false);
      console.log("Direct data fetch complete!");
    } catch (err) {
      console.error('Error in direct data fetch:', err);
      setError(err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDataDirect();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleDataUpdate = async (type) => {
    // Refresh data directly from localforage when updates occur
    console.log(`Updating data for ${type}`);
    
    try {
      switch (type) {
        case 'instruments':
          const instrumentsStore = localforage.createInstance({ name: 'instruments' });
          const instrumentsData = [];
          await instrumentsStore.iterate((value, key) => {
            instrumentsData.push(value);
          });
          console.log("Updated instruments:", instrumentsData);
          setInstruments(instrumentsData);
          break;
        case 'entryMethods':
          const entryMethodsStore = localforage.createInstance({ name: 'entry_methods' });
          const entryMethodsData = [];
          await entryMethodsStore.iterate((value, key) => {
            entryMethodsData.push(value);
          });
          setEntryMethods(entryMethodsData);
          break;
        case 'accounts':
          const accountsStore = localforage.createInstance({ name: 'accounts' });
          const accountsData = [];
          await accountsStore.iterate((value, key) => {
            accountsData.push(value);
          });
          setAccounts(accountsData);
          break;
        case 'confluences':
          const confluencesStore = localforage.createInstance({ name: 'confluences' });
          const confluencesData = [];
          await confluencesStore.iterate((value, key) => {
            confluencesData.push(value);
          });
          setConfluences(confluencesData);
          break;
        case 'minConfluences':
          const appSettingsStore = localforage.createInstance({ name: 'app_settings' });
          let minConfluencesValue = 3;
          await appSettingsStore.iterate((value, key) => {
            if (value.key === 'minimumConfluencesRequired') {
              minConfluencesValue = parseInt(value.value) || 3;
            }
          });
          setMinRequiredConfluences(minConfluencesValue);
          break;
        default:
          // Update all data
          fetchDataDirect();
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