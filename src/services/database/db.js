// Updated database functions for src/services/database/db.js

import localforage from 'localforage';
import { useState, useEffect } from 'react';
import { defaultData } from './defaultData';
import { ensureArray } from '../../utils/arrayUtils';

// Configure localforage
localforage.config({
  name: 'trade-tracker-db',
  storeName: 'trade_tracker_data'
});

// Store collections
const stores = {
  instruments: localforage.createInstance({ name: 'instruments' }),
  entry_methods: localforage.createInstance({ name: 'entry_methods' }),
  accounts: localforage.createInstance({ name: 'accounts' }),
  confluences: localforage.createInstance({ name: 'confluences' }),
  app_settings: localforage.createInstance({ name: 'app_settings' }),
  filters: localforage.createInstance({ name: 'filters' }),
  backtests: localforage.createInstance({ name: 'backtests' }),
  trades: localforage.createInstance({ name: 'trades' }),
  trade_journal: localforage.createInstance({ name: 'trade_journal' }),
  trade_confluences: localforage.createInstance({ name: 'trade_confluences' }),
  playbooks: localforage.createInstance({ name: 'playbooks' })
};

// Counter for auto-increment IDs
const counters = {
  instruments: 0,
  entry_methods: 0,
  accounts: 0,
  confluences: 0,
  app_settings: 0,
  filters: 0,
  backtests: 0,
  trades: 0,
  trade_journal: 0,
  trade_confluences: 0,
  playbooks: 0
};

// Last inserted ID
let lastInsertId = 0;

/**
 * Initialize the database
 */
export const initDatabase = async () => {
  try {
    console.log("Starting database initialization");
    
    // Check if database is already initialized
    const isInitialized = await localforage.getItem('db_initialized');
    
    if (!isInitialized) {
      console.log("Initializing database for the first time");
      
      // Clear any existing data to ensure a clean start
      for (const store of Object.keys(stores)) {
        await stores[store].clear();
        console.log(`Cleared store: ${store}`);
      }
      
      // Seed the default data
      const seedResult = await seedDefaultData();
      
      if (seedResult) {
        console.log("Setting db_initialized flag");
        await localforage.setItem('db_initialized', true);
      } else {
        console.error("Failed to seed default data");
        throw new Error("Failed to seed default data");
      }
    } else {
      console.log("Database already initialized");
      
      // Load counters
      for (const store of Object.keys(stores)) {
        const keys = await stores[store].keys();
        const ids = keys.map(k => parseInt(k)).filter(id => !isNaN(id));
        counters[store] = ids.length > 0 ? Math.max(...ids) : 0;
        console.log(`Loaded counter for ${store}: ${counters[store]}`);
      }
    }
    
    console.log("Database initialization complete");
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

/**
 * Seed default data
 */
const seedDefaultData = async () => {
  try {
    console.log("Seeding default data");
    
    // Seed default data for each collection
    for (const [table, data] of Object.entries(defaultData)) {
      if (Array.isArray(data) && data.length > 0) {
        console.log(`Inserting ${data.length} records into ${table}`);
        
        const store = stores[table];
        if (!store) {
          console.warn(`Store not found for table: ${table}`);
          continue;
        }
        
        let id = 1;
        for (const item of data) {
          // Make sure to create a new object to avoid reference issues
          const record = { id, ...JSON.parse(JSON.stringify(item)) };
          
          // Log each item we're inserting for debugging
          console.log(`Inserting into ${table}:`, record);
          
          // Insert the item into the store
          await store.setItem(id.toString(), record);
          id++;
        }
        
        counters[table] = id - 1;
        console.log(`Successfully inserted ${id-1} items into ${table}`);
      }
    }
    
    console.log("Default data seeded successfully");
    return true;
  } catch (error) {
    console.error('Error seeding default data:', error);
    throw error;
  }
};

/**
 * Execute a query to get data
 * This is a simplified query executor that always returns arrays
 */
export const executeQuery = async (query, params = []) => {
  try {
    console.log("Executing query:", query, params);
    
    // Very basic SQL parser to handle the most common queries
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('select') && queryLower.includes('from')) {
      // Extract table name
      const fromMatch = queryLower.match(/from\s+([a-z0-9_]+)/);
      if (!fromMatch) {
        console.warn('Invalid query: FROM clause not found');
        return [];
      }
      
      const tableName = fromMatch[1];
      const results = await queryTable(tableName, query, params);
      return ensureArray(results);
    }
    
    if (queryLower.startsWith('select last_insert_rowid()')) {
      return [{ id: lastInsertId }];
    }
    
    if (queryLower.startsWith('select sqlite_version()')) {
      return [{ 'sqlite_version()': '3.36.0' }];
    }
    
    console.warn('Unsupported query:', query);
    return [];
  } catch (error) {
    console.error('Error executing query:', query, error);
    console.trace();
    return []; // Always return an empty array on error for consistent behavior
  }
};

/**
 * Query a specific table with filtering
 */
const queryTable = async (tableName, query, params) => {
  try {
    const store = stores[tableName];
    if (!store) {
      console.warn(`Table not found: ${tableName}`);
      return [];
    }
    
    // Get all items from the store
    const items = [];
    await store.iterate((value) => {
      items.push(value);
    });
    
    // Very basic WHERE filter
    if (query.toLowerCase().includes('where')) {
      try {
        // This is a very simplified WHERE parser, supports basic conditions
        const whereClause = query.substring(query.toLowerCase().indexOf('where') + 5);
        const conditions = whereClause.split('and').map(c => c.trim());
        
        let paramIndex = 0;
        
        return items.filter(item => {
          return conditions.every(condition => {
            // Handle equality with parameters (WHERE x = ?)
            if (condition.includes('=') && condition.includes('?')) {
              const [field, _] = condition.split('=').map(p => p.trim());
              const paramValue = params[paramIndex++];
              return item[field] == paramValue; // Use == for type coercion
            }
            
            // Add more condition parsing as needed
            return true;
          });
        });
      } catch (filterError) {
        console.error('Error filtering items:', filterError);
        return items; // Return all items on filter error
      }
    }
    
    return items;
  } catch (error) {
    console.error(`Error querying table ${tableName}:`, error);
    return []; // Always return an empty array
  }
};

/**
 * Execute a non-query operation (INSERT, UPDATE, DELETE)
 * @returns {Promise<boolean>} Success or failure
 */
export const executeNonQuery = async (query, params = []) => {
  try {
    console.log("Executing non-query:", query, params);
    
    // Basic INSERT parser
    if (query.toLowerCase().startsWith('insert into')) {
      const match = query.match(/insert into\s+([a-z0-9_]+)\s*\(([^)]+)\)/i);
      if (!match) {
        console.error('Invalid INSERT query:', query);
        return false;
      }
      
      const tableName = match[1];
      const columns = match[2].split(',').map(c => c.trim());
      
      const result = await insertIntoTable(tableName, columns, params);
      return result;
    }
    
    // Basic UPDATE parser
    if (query.toLowerCase().startsWith('update')) {
      const match = query.match(/update\s+([a-z0-9_]+)\s+set/i);
      if (!match) {
        console.error('Invalid UPDATE query:', query);
        return false;
      }
      
      const tableName = match[1];
      const result = await updateTable(tableName, query, params);
      return result;
    }
    
    // Basic DELETE parser
    if (query.toLowerCase().startsWith('delete from')) {
      const match = query.match(/delete from\s+([a-z0-9_]+)/i);
      if (!match) {
        console.error('Invalid DELETE query:', query);
        return false;
      }
      
      const tableName = match[1];
      const result = await deleteFromTable(tableName, query, params);
      return result;
    }
    
    console.warn('Unsupported non-query:', query);
    return false;
  } catch (error) {
    console.error('Error executing non-query:', query, error);
    console.trace();
    return false; // Return false on error
  }
};

/**
 * Insert data into a table
 */
const insertIntoTable = async (tableName, columns, params) => {
  try {
    const store = stores[tableName];
    if (!store) {
      console.error(`Table not found: ${tableName}`);
      return false;
    }
    
    // Generate new ID
    counters[tableName]++;
    const id = counters[tableName];
    
    // Create object with column values
    const record = { id };
    for (let i = 0; i < columns.length; i++) {
      if (i < params.length) {
        record[columns[i]] = params[i];
      }
    }
    
    // Add timestamps if needed
    if (columns.includes('created_at') && !params[columns.indexOf('created_at')]) {
      record.created_at = new Date().toISOString();
    }
    
    console.log(`Inserting record into ${tableName}:`, record);
    
    // Store the record
    await store.setItem(id.toString(), record);
    
    // Update last insert id
    lastInsertId = id;
    
    return true;
  } catch (error) {
    console.error(`Error inserting into ${tableName}:`, error);
    return false;
  }
};

/**
 * Update data in a table
 */
const updateTable = async (tableName, query, params) => {
  try {
    const store = stores[tableName];
    if (!store) {
      console.error(`Table not found: ${tableName}`);
      return false;
    }
    
    // Extract WHERE clause to identify records to update
    const whereParts = query.toLowerCase().split('where');
    if (whereParts.length < 2) {
      console.error('UPDATE requires WHERE clause');
      return false;
    }
    
    const whereClause = whereParts[1].trim();
    
    // Very basic WHERE parser for id = ?
    if (whereClause.includes('id = ?')) {
      const idIndex = params.length - 1; // Assume ID is the last parameter
      const id = params[idIndex];
      
      if (!id) {
        console.error('Missing ID for UPDATE');
        return false;
      }
      
      // Get the record
      const record = await store.getItem(id.toString());
      if (!record) {
        console.warn(`Record with ID ${id} not found for update`);
        return false;
      }
      
      // Extract SET clause
      const setParts = query.toLowerCase().split('set')[1].split('where')[0].trim();
      const assignments = setParts.split(',').map(a => a.trim());
      
      // Update fields
      let paramIndex = 0;
      for (const assignment of assignments) {
        const [field, _] = assignment.split('=').map(p => p.trim());
        if (paramIndex < params.length) {
          record[field] = params[paramIndex++];
        }
      }
      
      // Save updated record
      await store.setItem(id.toString(), record);
      return true;
    }
    
    console.warn('Unsupported UPDATE condition:', whereClause);
    return false;
  } catch (error) {
    console.error(`Error updating table ${tableName}:`, error);
    return false;
  }
};

/**
 * Delete data from a table
 */
const deleteFromTable = async (tableName, query, params) => {
  try {
    const store = stores[tableName];
    if (!store) {
      console.error(`Table not found: ${tableName}`);
      return false;
    }
    
    // Extract WHERE clause
    const whereParts = query.toLowerCase().split('where');
    if (whereParts.length < 2) {
      console.error('DELETE requires WHERE clause');
      return false;
    }
    
    const whereClause = whereParts[1].trim();
    
    // Very basic WHERE parser for id = ?
    if (whereClause.includes('id = ?')) {
      const id = params[0];
      if (!id) {
        console.error('Missing ID for DELETE');
        return false;
      }
      
      // Check if the record exists
      const record = await store.getItem(id.toString());
      if (!record) {
        console.warn(`Record with ID ${id} not found for delete`);
        return false;
      }
      
      await store.removeItem(id.toString());
      return true;
    }
    
    console.warn('Unsupported DELETE condition:', whereClause);
    return false;
  } catch (error) {
    console.error(`Error deleting from table ${tableName}:`, error);
    return false;
  }
};

/**
 * Get the ID of the last inserted row
 */
export const getLastInsertId = () => {
  return lastInsertId;
};

/**
 * React hook to use database
 */
export const useDatabase = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const loadDatabase = async () => {
      try {
        await initDatabase();
        setIsLoading(false);
      } catch (err) {
        console.error('Database initialization error in hook:', err);
        setError(err.message || 'Unknown database error');
        setIsLoading(false);
      }
    };
    
    loadDatabase();
  }, []);
  
  return { 
    isLoading, 
    error,
    executeQuery,
    executeNonQuery,
    getLastInsertId
  };
};

// Export database services
export const DatabaseService = {
  initDatabase,
  executeQuery,
  executeNonQuery,
  getLastInsertId
};

export default DatabaseService;