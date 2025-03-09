// src/services/database/db.js
import dbStorageService from './dbStorageService';

/**
 * Initialize the database
 * @returns {Promise<boolean>} Success or failure
 */
export const initDatabase = async () => {
  try {
    // Initialize the database service
    await dbStorageService.initialize();
    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

/**
 * Execute a query to get data
 * @param {string} query - SQL query to execute
 * @param {Array} params - Query parameters
 * @returns {Array} Array of result objects
 */
export const executeQuery = (query, params = []) => {
  return dbStorageService.executeQuery(query, params);
};

/**
 * Execute a non-query operation (INSERT, UPDATE, DELETE)
 * @param {string} query - SQL query to execute
 * @param {Array} params - Query parameters
 * @returns {boolean} Success or failure
 */
export const executeNonQuery = (query, params = []) => {
  return dbStorageService.executeNonQuery(query, params);
};

/**
 * Get the ID of the last inserted row
 * @returns {number} Last insert row ID
 */
export const getLastInsertId = () => {
  return dbStorageService.getLastInsertId();
};

/**
 * Export database to file system
 * @returns {Promise<boolean>} Success or failure
 */
export const exportDatabase = async () => {
  return await dbStorageService.saveToFile();
};

/**
 * Import database from file system
 * @returns {Promise<boolean>} Success or failure
 */
export const importDatabase = async () => {
  return await dbStorageService.loadFromFile();
};

/**
 * Reset database to default state
 * @returns {Promise<boolean>} Success or failure
 */
export const resetDatabase = async () => {
  // Close current database
  dbStorageService.close();
  
  // Clear localStorage
  localStorage.removeItem('trade-tracker-db');
  
  // Reinitialize
  await dbStorageService.initialize();
  
  return true;
};

// Export database services
export const DatabaseService = {
  initDatabase,
  executeQuery,
  executeNonQuery,
  getLastInsertId,
  exportDatabase,
  importDatabase,
  resetDatabase
};

export default DatabaseService;