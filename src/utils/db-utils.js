// db-utils.js
// Helper functions to ensure consistent data handling

/**
 * Ensures a value is an array
 * @param {*} value - The value to check
 * @returns {Array} The original array or an empty array if value wasn't an array
 */
export const ensureArray = (value) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };
  
  /**
   * Safe query wrapper that ensures array results
   * @param {Function} queryFn - The original query function
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Array} Query results as array
   */
  export const safeExecuteQuery = (queryFn, query, params = []) => {
    try {
      const results = queryFn(query, params);
      return ensureArray(results);
    } catch (error) {
      console.error('Error in safeExecuteQuery:', error);
      console.error('Query:', query);
      console.error('Params:', params);
      return [];
    }
  };
  
  /**
   * Safe version of mapping over potentially non-array data
   * @param {*} data - Data to map over
   * @param {Function} mapFn - Mapping function
   * @returns {Array} Mapped array
   */
  export const safeMap = (data, mapFn) => {
    return ensureArray(data).map(mapFn);
  };
  
  /**
   * Safely executes a forEach on data, ensuring it's an array first
   * @param {*} data - Data to iterate over
   * @param {Function} forEachFn - Function to execute for each element
   */
  export const safeForEach = (data, forEachFn) => {
    ensureArray(data).forEach(forEachFn);
  };
  
  /**
   * Gets direct access to a store and all its values 
   * @param {Object} localforage - Localforage instance
   * @param {string} storeName - Name of the store
   * @returns {Promise<Array>} Array of all values in store
   */
  export const getAllFromStore = async (localforage, storeName) => {
    try {
      const store = localforage.createInstance({ name: storeName });
      const items = [];
      await store.iterate((value) => {
        items.push(value);
      });
      return items;
    } catch (error) {
      console.error(`Error getting all items from ${storeName}:`, error);
      return [];
    }
  };