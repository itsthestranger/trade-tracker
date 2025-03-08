// src/utils/arrayUtils.js

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
   * Safe mapping function that works even if the input isn't an array
   * @param {*} data - The data to map over
   * @param {Function} mapFn - Mapping function that takes an item and returns transformed item
   * @param {Array} defaultValue - Value to return if data isn't valid for mapping
   * @returns {Array} The mapped array or defaultValue if data can't be mapped
   */
  export const safeMap = (data, mapFn, defaultValue = []) => {
    if (!data) return defaultValue;
    if (!Array.isArray(data)) {
      try {
        // If it's a single item, map on array of one
        return [mapFn(data)];
      } catch (e) {
        console.warn('safeMap: Failed to map non-array data', e);
        return defaultValue;
      }
    }
    return data.map(mapFn);
  };
  
  /**
   * Safe filtering function that works even if the input isn't an array
   * @param {*} data - The data to filter
   * @param {Function} filterFn - Filter function that takes an item and returns true/false
   * @param {Array} defaultValue - Value to return if data isn't valid for filtering
   * @returns {Array} The filtered array or defaultValue if data can't be filtered
   */
  export const safeFilter = (data, filterFn, defaultValue = []) => {
    if (!data) return defaultValue;
    return ensureArray(data).filter(filterFn);
  };
  
  /**
   * Safe forEach function that works even if the input isn't an array
   * @param {*} data - The data to iterate over
   * @param {Function} forEachFn - Function to execute for each element
   */
  export const safeForEach = (data, forEachFn) => {
    ensureArray(data).forEach(forEachFn);
  };
  
  /**
   * Safe find function that works even if the input isn't an array
   * @param {*} data - The data to search
   * @param {Function} findFn - Find function that takes an item and returns true/false
   * @param {*} defaultValue - Value to return if item isn't found or data isn't valid
   * @returns {*} The found item or defaultValue if no item is found
   */
  export const safeFind = (data, findFn, defaultValue = null) => {
    if (!data) return defaultValue;
    if (!Array.isArray(data)) {
      try {
        // If it's a single item, check if it matches
        return findFn(data) ? data : defaultValue;
      } catch (e) {
        return defaultValue;
      }
    }
    return data.find(findFn) || defaultValue;
  };
  
  /**
   * Safe array length check
   * @param {*} data - The data to check length
   * @returns {number} The length of the array or 0 if not an array
   */
  export const safeLength = (data) => {
    if (!data) return 0;
    return Array.isArray(data) ? data.length : 0;
  };
  
  /**
   * Safely gets a value at an index in an array
   * @param {*} array - The array to access
   * @param {number} index - The index to access
   * @param {*} defaultValue - Value to return if index doesn't exist
   * @returns {*} The value at the index or defaultValue
   */
  export const safeGet = (array, index, defaultValue = null) => {
    if (!Array.isArray(array) || index < 0 || index >= array.length) {
      return defaultValue;
    }
    return array[index];
  };