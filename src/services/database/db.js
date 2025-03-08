// src/services/database/db.js
import localforage from 'localforage';
import { useState, useEffect } from 'react';
import { defaultData } from './defaultData';

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
      await seedDefaultData();
      await localforage.setItem('db_initialized', true);
    } else {
      console.log("Database already initialized");
      
      // Load counters
      for (const store of Object.keys(stores)) {
        const keys = await stores[store].keys();
        const ids = keys.map(k => parseInt(k)).filter(id => !isNaN(id));
        counters[store] = ids.length > 0 ? Math.max(...ids) : 0;
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
          await store.setItem(id.toString(), { id, ...item });
          id++;
        }
        
        counters[table] = id - 1;
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
 * This is a simplified query executor that supports basic WHERE clauses
 */
export const executeQuery = (query, params = []) => {
  try {
    console.log("Executing query:", query, params);
    
    // Very basic SQL parser to handle the most common queries
    // This is not a full SQL parser, just enough to get by
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('select') && queryLower.includes('from')) {
      // Extract table name
      const fromMatch = queryLower.match(/from\s+([a-z0-9_]+)/);
      if (!fromMatch) {
        throw new Error('Invalid query: FROM clause not found');
      }
      
      const tableName = fromMatch[1];
      return queryTable(tableName, query, params);
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
    throw error;
  }
};

/**
 * Query a specific table with filtering
 */
const queryTable = async (tableName, query, params) => {
  const store = stores[tableName];
  if (!store) {
    throw new Error(`Table not found: ${tableName}`);
  }
  
  // Get all items from the store
  const items = [];
  await store.iterate((value) => {
    items.push(value);
  });
  
  // Very basic WHERE filter
  if (query.toLowerCase().includes('where')) {
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
  }
  
  return items;
};

/**
 * Execute a non-query operation (INSERT, UPDATE, DELETE)
 */
export const executeNonQuery = (query, params = []) => {
  try {
    console.log("Executing non-query:", query, params);
    
    // Basic INSERT parser
    if (query.toLowerCase().startsWith('insert into')) {
      const match = query.match(/insert into\s+([a-z0-9_]+)\s*\(([^)]+)\)/i);
      if (!match) {
        throw new Error('Invalid INSERT query');
      }
      
      const tableName = match[1];
      const columns = match[2].split(',').map(c => c.trim());
      
      return insertIntoTable(tableName, columns, params);
    }
    
    // Basic UPDATE parser
    if (query.toLowerCase().startsWith('update')) {
      const match = query.match(/update\s+([a-z0-9_]+)\s+set/i);
      if (!match) {
        throw new Error('Invalid UPDATE query');
      }
      
      const tableName = match[1];
      return updateTable(tableName, query, params);
    }
    
    // Basic DELETE parser
    if (query.toLowerCase().startsWith('delete from')) {
      const match = query.match(/delete from\s+([a-z0-9_]+)/i);
      if (!match) {
        throw new Error('Invalid DELETE query');
      }
      
      const tableName = match[1];
      return deleteFromTable(tableName, query, params);
    }
    
    console.warn('Unsupported non-query:', query);
    return false;
  } catch (error) {
    console.error('Error executing non-query:', query, error);
    throw error;
  }
};

/**
 * Insert data into a table
 */
const insertIntoTable = async (tableName, columns, params) => {
  const store = stores[tableName];
  if (!store) {
    throw new Error(`Table not found: ${tableName}`);
  }
  
  // Generate new ID
  counters[tableName]++;
  const id = counters[tableName];
  
  // Create object with column values
  const record = { id };
  for (let i = 0; i < columns.length; i++) {
    record[columns[i]] = params[i];
  }
  
  // Add timestamps if needed
  if (columns.includes('created_at') && !params[columns.indexOf('created_at')]) {
    record.created_at = new Date().toISOString();
  }
  
  // Store the record
  await store.setItem(id.toString(), record);
  
  // Update last insert id
  lastInsertId = id;
  
  return true;
};

/**
 * Update data in a table
 */
const updateTable = async (tableName, query, params) => {
  const store = stores[tableName];
  if (!store) {
    throw new Error(`Table not found: ${tableName}`);
  }
  
  // Extract WHERE clause to identify records to update
  const whereParts = query.toLowerCase().split('where');
  if (whereParts.length < 2) {
    throw new Error('UPDATE requires WHERE clause');
  }
  
  const whereClause = whereParts[1].trim();
  
  // Very basic WHERE parser for id = ?
  if (whereClause.includes('id = ?')) {
    const idIndex = params.length - 1; // Assume ID is the last parameter
    const id = params[idIndex];
    
    // Get the record
    const record = await store.getItem(id.toString());
    if (!record) {
      return false;
    }
    
    // Extract SET clause
    const setParts = query.toLowerCase().split('set')[1].split('where')[0].trim();
    const assignments = setParts.split(',').map(a => a.trim());
    
    // Update fields
    let paramIndex = 0;
    for (const assignment of assignments) {
      const [field, _] = assignment.split('=').map(p => p.trim());
      record[field] = params[paramIndex++];
    }
    
    // Save updated record
    await store.setItem(id.toString(), record);
    return true;
  }
  
  console.warn('Unsupported UPDATE condition:', whereClause);
  return false;
};

/**
 * Delete data from a table
 */
const deleteFromTable = async (tableName, query, params) => {
  const store = stores[tableName];
  if (!store) {
    throw new Error(`Table not found: ${tableName}`);
  }
  
  // Extract WHERE clause
  const whereParts = query.toLowerCase().split('where');
  if (whereParts.length < 2) {
    throw new Error('DELETE requires WHERE clause');
  }
  
  const whereClause = whereParts[1].trim();
  
  // Very basic WHERE parser for id = ?
  if (whereClause.includes('id = ?')) {
    const id = params[0];
    await store.removeItem(id.toString());
    return true;
  }
  
  console.warn('Unsupported DELETE condition:', whereClause);
  return false;
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