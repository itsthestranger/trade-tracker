// DatabaseDebugger.jsx
import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Divider,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';

// Import localforage directly for direct access
import localforage from 'localforage';
import { defaultData } from '../../services/database/defaultData';

const DatabaseDebugger = ({ onUpdate }) => {
  const [debugOutput, setDebugOutput] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const log = (message) => {
    setDebugOutput(prev => [...prev, { time: new Date().toISOString(), message }]);
    console.log(message);
  };

  const resetDatabase = async () => {
    setIsLoading(true);
    setDebugOutput([]);
    try {
      log("Starting database reset...");

      // 1. Clear the initialization flag
      log("Clearing initialization flag...");
      await localforage.removeItem('db_initialized');
      
      // 2. Clear all stores
      const stores = [
        'instruments', 'entry_methods', 'accounts', 'confluences', 
        'app_settings', 'filters', 'backtests', 'trades', 
        'trade_journal', 'trade_confluences', 'playbooks'
      ];
      
      for (const store of stores) {
        log(`Clearing store: ${store}...`);
        const storeInstance = localforage.createInstance({ name: store });
        await storeInstance.clear();
      }
      
      // 3. Add default data
      log("Adding default data...");
      
      // Instruments
      log(`Adding ${defaultData.instruments.length} instruments...`);
      const instrumentsStore = localforage.createInstance({ name: 'instruments' });
      for (let i = 0; i < defaultData.instruments.length; i++) {
        const instrument = defaultData.instruments[i];
        const id = i + 1;
        await instrumentsStore.setItem(id.toString(), { id, ...instrument });
        log(`Added instrument: ${instrument.name} with ID ${id}`);
      }
      
      // Entry Methods
      log(`Adding ${defaultData.entry_methods.length} entry methods...`);
      const entryMethodsStore = localforage.createInstance({ name: 'entry_methods' });
      for (let i = 0; i < defaultData.entry_methods.length; i++) {
        const method = defaultData.entry_methods[i];
        const id = i + 1;
        await entryMethodsStore.setItem(id.toString(), { id, ...method });
      }
      
      // Confluences
      log(`Adding ${defaultData.confluences.length} confluences...`);
      const confluencesStore = localforage.createInstance({ name: 'confluences' });
      for (let i = 0; i < defaultData.confluences.length; i++) {
        const confluence = defaultData.confluences[i];
        const id = i + 1;
        await confluencesStore.setItem(id.toString(), { id, ...confluence });
      }
      
      // Accounts
      log(`Adding ${defaultData.accounts.length} accounts...`);
      const accountsStore = localforage.createInstance({ name: 'accounts' });
      for (let i = 0; i < defaultData.accounts.length; i++) {
        const account = defaultData.accounts[i];
        const id = i + 1;
        await accountsStore.setItem(id.toString(), { id, ...account });
      }
      
      // App Settings
      log(`Adding ${defaultData.app_settings.length} app settings...`);
      const appSettingsStore = localforage.createInstance({ name: 'app_settings' });
      for (let i = 0; i < defaultData.app_settings.length; i++) {
        const setting = defaultData.app_settings[i];
        const id = i + 1;
        await appSettingsStore.setItem(id.toString(), { id, ...setting });
      }
      
      // 4. Set initialization flag
      log("Setting initialization flag...");
      await localforage.setItem('db_initialized', true);
      
      // 5. Verify data was added
      log("Verifying data was added...");
      const instrumentKeys = await instrumentsStore.keys();
      log(`Found ${instrumentKeys.length} instruments in database`);
      
      for (const key of instrumentKeys) {
        const instrument = await instrumentsStore.getItem(key);
        log(`Instrument ID ${key}: ${instrument.name}`);
      }
      
      log("Database reset complete!");
      
      // Trigger UI update
      if (onUpdate) {
        log("Triggering UI update...");
        onUpdate();
      }

      log("Please reload the application to see changes");
    } catch (error) {
      log(`ERROR: ${error.message}`);
      console.error("Database reset error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkDatabase = async () => {
    setIsLoading(true);
    setDebugOutput([]);
    try {
      log("Checking database status...");
      
      // Check initialization flag
      const isInitialized = await localforage.getItem('db_initialized');
      log(`Database initialized: ${isInitialized ? 'Yes' : 'No'}`);
      
      // Check each store
      const stores = [
        'instruments', 'entry_methods', 'accounts', 'confluences', 
        'app_settings', 'filters', 'backtests', 'trades', 
        'trade_journal', 'trade_confluences', 'playbooks'
      ];
      
      for (const store of stores) {
        const storeInstance = localforage.createInstance({ name: store });
        const keys = await storeInstance.keys();
        log(`Store '${store}' contains ${keys.length} items`);
        
        if (store === 'instruments' && keys.length > 0) {
          log("Instruments found:");
          for (const key of keys) {
            const item = await storeInstance.getItem(key);
            log(`- ID ${key}: ${item.name} (${item.color})`);
          }
        }
      }
      
      log("Database check complete!");
    } catch (error) {
      log(`ERROR: ${error.message}`);
      console.error("Database check error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const testAddInstrument = async () => {
    setIsLoading(true);
    try {
      log("Testing adding an instrument directly...");
      
      const store = localforage.createInstance({ name: 'instruments' });
      const keys = await store.keys();
      const nextId = keys.length > 0 ? Math.max(...keys.map(k => parseInt(k))) + 1 : 1;
      
      const testInstrument = {
        id: nextId,
        name: `Test Instrument ${Date.now()}`,
        tickValue: 0.50,
        color: '#FF0000'
      };
      
      log(`Adding test instrument with ID ${nextId}: ${testInstrument.name}`);
      await store.setItem(nextId.toString(), testInstrument);
      
      log("Test instrument added successfully!");
      log("Verifying...");
      
      const addedInstrument = await store.getItem(nextId.toString());
      if (addedInstrument) {
        log(`Verified: ${addedInstrument.id} - ${addedInstrument.name}`);
      } else {
        log("ERROR: Failed to retrieve the added instrument");
      }
      
      if (onUpdate) {
        log("Triggering UI update...");
        onUpdate();
      }
    } catch (error) {
      log(`ERROR: ${error.message}`);
      console.error("Test add instrument error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 2, mt: 4, bgcolor: '#f5f5f5' }}>
      <Typography variant="h6" gutterBottom>
        Database Debugger
      </Typography>
      <Box sx={{ mb: 2 }}>
        <Button 
          variant="contained" 
          color="error" 
          onClick={resetDatabase} 
          disabled={isLoading}
          sx={{ mr: 1 }}
        >
          Reset Database
        </Button>
        <Button 
          variant="outlined"
          onClick={checkDatabase}
          disabled={isLoading}
          sx={{ mr: 1 }}
        >
          Check Database
        </Button>
        <Button 
          variant="outlined"
          color="success"
          onClick={testAddInstrument}
          disabled={isLoading}
        >
          Test Add Instrument
        </Button>
      </Box>
      
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Debug Output ({debugOutput.length} lines)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ 
            maxHeight: 300, 
            overflow: 'auto',
            border: '1px solid #ddd',
            borderRadius: 1,
            p: 1,
            bgcolor: '#000',
            color: '#fff',
            fontFamily: 'monospace'
          }}>
            {debugOutput.map((entry, index) => (
              <Typography key={index} variant="body2" sx={{ fontSize: '0.8rem' }}>
                [{entry.time.split('T')[1].split('.')[0]}] {entry.message}
              </Typography>
            ))}
            {debugOutput.length === 0 && (
              <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#999' }}>
                No output yet. Click a button to start debugging.
              </Typography>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default DatabaseDebugger;