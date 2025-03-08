// src/services/database/defaultData.js

export const defaultData = {
  instruments: [
    { name: 'ES (E-mini S&P 500)', tickValue: 0.25, color: '#4CAF50' },
    { name: 'NQ (E-mini Nasdaq-100)', tickValue: 0.25, color: '#2196F3' }
  ],
  
  entry_methods: [
    { name: 'Mode Time – Max Retracement', description: 'Entry at maximum retracement during mode time', color: '#4CAF50' },
    { name: 'Mode Time M7 Retracement', description: 'Entry at M7 retracement during mode time', color: '#2196F3' }
  ],
  
  confluences: [
    { name: 'Weekly DRCs' },
    { name: 'Weekly DRC Open' }
  ],
  
  accounts: [
    { name: 'Demo Account', size: 10000, percentEqualingOneR: 1, color: '#4CAF50' }
  ],
  
  app_settings: [
    { key: 'minimumConfluencesRequired', value: '3' }
  ]
};