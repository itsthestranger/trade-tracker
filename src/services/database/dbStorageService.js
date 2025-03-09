// src/services/database/dbStorageService.js
import initSqlJs from 'sql.js';

/**
 * Service to handle file-based SQLite database storage
 */
class DatabaseStorageService {
  constructor() {
    this.db = null;
    this.SQL = null;
    this.initialized = false;
    this.lastInsertRowId = 0;
    this.autoSaveEnabled = true;
    this.autoSaveInterval = null;
    this.autoSaveIntervalMs = 60000; // 1 minute
    this.dbFilename = 'trade-tracker.db';
  }

  /**
   * Initialize the database
   * @param {ArrayBuffer} [existingDbBuffer] - Optional existing database buffer to load
   * @returns {Promise<boolean>} Success or failure
   */
  async initialize(existingDbBuffer = null) {
    try {
      console.log('Initializing SQL.js...');
      
      // Initialize SQL.js with proper path to wasm file
      this.SQL = await initSqlJs({
        // Make sure this path is correct
        locateFile: file => {
          console.log(`Locating SQL file: ${file}`);
          return `${process.env.PUBLIC_URL}/sql-wasm/${file}`;
        }
      });
      
      console.log('SQL.js initialized successfully');

      // Create a new empty database first
      if (existingDbBuffer) {
        // Load existing database from buffer with proper error handling
        try {
          console.log('Loading database from provided buffer');
          this.db = new this.SQL.Database(new Uint8Array(existingDbBuffer));
          console.log('Database loaded from existing buffer');
        } catch (err) {
          console.error('Error loading database from buffer:', err);
          this.db = new this.SQL.Database();
          console.log('Created new database after buffer load failure');
        }
      } else {
        // Try to load from local storage as fallback
        const savedDb = localStorage.getItem('trade-tracker-db');
        if (savedDb) {
          try {
            console.log('Found database in localStorage, attempting to load');
            const dbData = new Uint8Array(JSON.parse(savedDb));
            this.db = new this.SQL.Database(dbData);
            console.log('Database loaded from localStorage successfully');
          } catch (err) {
            console.error('Error loading database from localStorage, creating new one', err);
            this.db = new this.SQL.Database();
            console.log('Created new database after localStorage load failure');
          }
        } else {
          // Create a new database
          console.log('No existing database found, creating new one');
          this.db = new this.SQL.Database();
          console.log('Created new database');
        }
      }

      // Load schema and initialize tables
      await this.initializeSchema();

      // Setup auto-save if enabled
      if (this.autoSaveEnabled) {
        this.startAutoSave();
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  /**
   * Initialize the database schema
   */
  async initializeSchema() {
    try {
      console.log('Initializing database schema...');
      
      // Import the schema
      const { schema } = await import('./schema');
      
      // Execute the schema SQL - using try/catch to handle errors
      try {
        this.db.exec(schema);
        console.log('Database schema executed successfully');
      } catch (err) {
        console.error('Error executing schema SQL:', err);
        // Continue anyway as tables might already exist
      }
      
      // Check if we need to seed default data
      const appSettings = this.executeQuery('SELECT * FROM app_settings WHERE key = "db_initialized"');
      if (!appSettings.length) {
        console.log('No initialization flag found, seeding default data');
        await this.seedDefaultData();
        try {
          this.executeNonQuery(
            'INSERT INTO app_settings (key, value) VALUES (?, ?)',
            ['db_initialized', 'true']
          );
          console.log('Set db_initialized flag');
        } catch (err) {
          console.error('Error setting initialization flag:', err);
        }
      } else {
        console.log('Database already initialized, skipping seed');
      }

      console.log('Database schema initialization complete');
    } catch (err) {
      console.error('Error in initializeSchema:', err);
      // Create a basic app_settings table if it doesn't exist yet
      try {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS app_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT NOT NULL UNIQUE,
            value TEXT NOT NULL
          );
        `);
        console.log('Created minimal app_settings table');
      } catch (tableErr) {
        console.error('Could not create basic tables:', tableErr);
      }
    }
  }

  /**
   * Seed default data into the database
   */
  async seedDefaultData() {
    try {
      console.log('Seeding default data...');
      const { defaultData } = await import('./defaultData');
      
      // Insert default data for each table
      for (const [table, data] of Object.entries(defaultData)) {
        if (Array.isArray(data) && data.length > 0) {
          console.log(`Seeding ${table} with ${data.length} records...`);
          
          for (const item of data) {
            const columns = Object.keys(item).join(', ');
            const placeholders = Object.keys(item).map(() => '?').join(', ');
            const values = Object.values(item);
            
            try {
              this.executeNonQuery(
                `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
                values
              );
            } catch (err) {
              console.error(`Error inserting into ${table}:`, err);
              // Continue with other items
            }
          }
        }
      }
      
      console.log('Default data seeded successfully');
      return true;
    } catch (error) {
      console.error('Error seeding default data:', error);
      return false;
    }
  }

  /**
   * Execute a query and return results
   * @param {string} query - SQL query to execute
   * @param {Array} params - Query parameters
   * @returns {Array} Array of result objects
   */
  executeQuery(query, params = []) {
    if (!this.db) {
      console.error('Database not initialized');
      return [];
    }

    try {
      // Prepare statement and bind parameters
      const stmt = this.db.prepare(query);
      
      if (params && params.length > 0) {
        stmt.bind(params);
      }
      
      // Execute the query and collect results
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      
      // Free the statement
      stmt.free();
      
      return results;
    } catch (error) {
      console.error('Error executing query:', query, error);
      return [];
    }
  }

  /**
   * Execute a non-query operation (INSERT, UPDATE, DELETE)
   * @param {string} query - SQL query to execute
   * @param {Array} params - Query parameters
   * @returns {boolean} Success or failure
   */
  executeNonQuery(query, params = []) {
    if (!this.db) {
      console.error('Database not initialized');
      return false;
    }

    try {
      // Execute the statement
      const stmt = this.db.prepare(query);
      
      if (params && params.length > 0) {
        stmt.bind(params);
      }
      
      stmt.step();
      stmt.free();
      
      // Update last insert row ID if this was an INSERT
      if (query.trim().toLowerCase().startsWith('insert')) {
        try {
          const lastIdResult = this.db.exec('SELECT last_insert_rowid()');
          if (lastIdResult && lastIdResult.length > 0 && 
              lastIdResult[0].values && lastIdResult[0].values.length > 0) {
            this.lastInsertRowId = lastIdResult[0].values[0][0];
          }
        } catch (err) {
          console.error('Error getting last insert ID:', err);
        }
      }
      
      // If auto-save is not enabled, still save to localStorage as backup
      if (!this.autoSaveInterval) {
        this.saveToLocalStorage();
      }
      
      return true;
    } catch (error) {
      console.error('Error executing non-query:', query, error);
      return false;
    }
  }

  /**
   * Get the ID of the last inserted row
   * @returns {number} Last insert row ID
   */
  getLastInsertId() {
    return this.lastInsertRowId;
  }

  /**
   * Export the database to a file
   * @returns {Uint8Array} Database as binary data
   */
  exportDatabase() {
    if (!this.db) {
      console.error('Database not initialized');
      return null;
    }

    try {
      // Get binary database data
      const data = this.db.export();
      return data;
    } catch (error) {
      console.error('Error exporting database:', error);
      return null;
    }
  }

  /**
   * Save database to a file using File System Access API
   * @param {string} [filename] - Optional filename
   * @returns {Promise<boolean>} Success or failure
   */
  async saveToFile(filename = null) {
    if (!this.db) {
      console.error('Database not initialized');
      return false;
    }

    try {
      // Check if File System Access API is available
      if ('showSaveFilePicker' in window) {
        console.log('Using File System Access API to save');
        const data = this.exportDatabase();
        if (!data) {
          console.error('Failed to export database');
          return false;
        }
        
        // Prepare file handle
        const options = {
          suggestedName: filename || this.dbFilename,
          types: [{
            description: 'SQLite Database',
            accept: {'application/x-sqlite3': ['.db', '.sqlite', '.sqlite3']}
          }]
        };
        
        try {
          // Show file picker
          const fileHandle = await window.showSaveFilePicker(options);
          const writable = await fileHandle.createWritable();
          await writable.write(data);
          await writable.close();
          
          console.log('Database saved to file successfully');
          return true;
        } catch (err) {
          if (err.name === 'AbortError') {
            console.log('User canceled file save operation');
            return false;
          }
          throw err;
        }
      } else {
        // Fallback to download approach
        console.log('File System Access API not available, using download instead');
        const data = this.exportDatabase();
        if (!data) {
          console.error('Failed to export database');
          return false;
        }
        
        const blob = new Blob([data], { type: 'application/x-sqlite3' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || this.dbFilename;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 0);
        
        console.log('Database downloaded successfully');
        return true;
      }
    } catch (error) {
      console.error('Error saving database to file:', error);
      return false;
    }
  }

  /**
   * Save database to localStorage as a backup
   */
  saveToLocalStorage() {
    if (!this.db) {
      console.error('Database not initialized');
      return;
    }

    try {
      const data = this.exportDatabase();
      if (!data) {
        console.error('Failed to export database for localStorage');
        return;
      }
      
      const json = JSON.stringify(Array.from(data));
      localStorage.setItem('trade-tracker-db', json);
      console.log('Database saved to localStorage');
    } catch (error) {
      console.error('Error saving database to localStorage:', error);
    }
  }

  /**
   * Load database from a file using File System Access API
   * @returns {Promise<boolean>} Success or failure
   */
  async loadFromFile() {
    try {
      // Check if File System Access API is available
      if ('showOpenFilePicker' in window) {
        console.log('Using File System Access API to load file');
        const options = {
          types: [{
            description: 'SQLite Database',
            accept: {'application/x-sqlite3': ['.db', '.sqlite', '.sqlite3']}
          }],
          multiple: false
        };
        
        try {
          // Show file picker
          const [fileHandle] = await window.showOpenFilePicker(options);
          const file = await fileHandle.getFile();
          const buffer = await file.arrayBuffer();
          
          // Close existing database
          if (this.db) {
            this.db.close();
          }
          
          // Initialize with new database
          await this.initialize(buffer);
          
          console.log('Database loaded from file successfully');
          return true;
        } catch (err) {
          if (err.name === 'AbortError') {
            console.log('User canceled file selection');
            return false;
          }
          throw err;
        }
      } else {
        // Fallback to file input
        console.log('File System Access API not available, using file input instead');
        return new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.db,.sqlite,.sqlite3';
          
          input.onchange = async (event) => {
            if (event.target.files.length > 0) {
              const file = event.target.files[0];
              const reader = new FileReader();
              
              reader.onload = async (e) => {
                // Close existing database
                if (this.db) {
                  this.db.close();
                }
                
                try {
                  // Initialize with new database
                  await this.initialize(e.target.result);
                  
                  console.log('Database loaded from file successfully');
                  resolve(true);
                } catch (err) {
                  console.error('Error initializing database from file:', err);
                  resolve(false);
                }
              };
              
              reader.onerror = () => {
                console.error('Error reading database file');
                resolve(false);
              };
              
              reader.readAsArrayBuffer(file);
            } else {
              resolve(false);
            }
          };
          
          input.click();
        });
      }
    } catch (error) {
      console.error('Error loading database from file:', error);
      return false;
    }
  }

  /**
   * Start auto-save interval
   */
  startAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(() => {
      this.saveToLocalStorage();
    }, this.autoSaveIntervalMs);
    
    console.log(`Auto-save started, interval: ${this.autoSaveIntervalMs}ms`);
  }

  /**
   * Stop auto-save interval
   */
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
      console.log('Auto-save stopped');
    }
  }

  /**
   * Configure auto-save settings
   * @param {boolean} enabled - Whether auto-save is enabled
   * @param {number} intervalMs - Auto-save interval in milliseconds
   */
  configureAutoSave(enabled, intervalMs = 60000) {
    this.autoSaveEnabled = enabled;
    this.autoSaveIntervalMs = intervalMs;

    if (enabled) {
      this.startAutoSave();
    } else {
      this.stopAutoSave();
    }
    
    console.log(`Auto-save configured: enabled=${enabled}, interval=${intervalMs}ms`);
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.stopAutoSave();
      this.db.close();
      this.db = null;
      this.initialized = false;
      console.log('Database connection closed');
    }
  }
}

// Create a singleton instance
const dbStorageService = new DatabaseStorageService();

export default dbStorageService;