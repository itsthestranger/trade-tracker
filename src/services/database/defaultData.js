// src/services/database/defaultData.js

export const defaultData = {
  instruments: [
    { name: 'ES (E-mini S&P 500)', tickValue: 12.5, color: '#4CAF50' },
    { name: 'NQ (E-mini Nasdaq-100)', tickValue: 5.0, color: '#2196F3' }
  ],
  
  entry_methods: [
    { name: 'Mode Time – Max Retracement', description: 'Entry at maximum retracement during mode time', color: '#4CAF50' },
    { name: 'Mode Time M7 Retracement', description: 'Entry at M7 retracement during mode time', color: '#2196F3' },
    { name: 'Time Cluster 1', description: 'Entry during the first time cluster', color: '#F44336' },
    { name: 'Time Cluster 2', description: 'Entry during the second time cluster', color: '#FF9800' },
    { name: 'Time Cluster 3', description: 'Entry during the third time cluster', color: '#9C27B0' },
    { name: 'Median Time', description: 'Entry at the median time', color: '#795548' },
    { name: 'Retracement Cluster 1 – Max Retracement', description: 'Entry at maximum retracement in cluster 1', color: '#607D8B' },
    { name: 'Retracement Cluster 2 – Max Retracement', description: 'Entry at maximum retracement in cluster 2', color: '#009688' },
    { name: 'Retracement Cluster 3 – Max Retracement', description: 'Entry at maximum retracement in cluster 3', color: '#8BC34A' },
    { name: 'Retracement Cluster 1 – M7 Retracement', description: 'Entry at M7 retracement in cluster 1', color: '#CDDC39' },
    { name: 'Retracement Cluster 2 – M7 Retracement', description: 'Entry at M7 retracement in cluster 2', color: '#FFC107' },
    { name: 'Retracement Cluster 3 – M7 Retracement', description: 'Entry at M7 retracement in cluster 3', color: '#FF5722' },
    { name: 'Percentage Cluster 1 – Max Retracement', description: 'Entry based on percentage in cluster 1 with max retracement', color: '#3F51B5' },
    { name: 'Percentage Cluster 2 – Max Retracement', description: 'Entry based on percentage in cluster 2 with max retracement', color: '#2196F3' },
    { name: 'Percentage Cluster 3 – Max Retracement', description: 'Entry based on percentage in cluster 3 with max retracement', color: '#03A9F4' },
    { name: 'Percentage Cluster 1 – M7 Retracement', description: 'Entry based on percentage in cluster 1 with M7 retracement', color: '#00BCD4' },
    { name: 'Percentage Cluster 2 – M7 Retracement', description: 'Entry based on percentage in cluster 2 with M7 retracement', color: '#009688' },
    { name: 'Percentage Cluster 3 – M7 Retracement', description: 'Entry based on percentage in cluster 3 with M7 retracement', color: '#4CAF50' },
    { name: 'Retirement Setup', description: 'Entry based on retirement setup pattern', color: '#8BC34A' },
    { name: 'TDRC Rejection + Retracement Cluster', description: 'Entry on TDRC rejection with retracement cluster', color: '#CDDC39' },
    { name: '7IB Rejection + Retracement Cluster', description: 'Entry on 7IB rejection with retracement cluster', color: '#FFC107' },
    { name: 'Range Contraction Model', description: 'Entry based on range contraction model', color: '#FF9800' },
    { name: 'Range Expansion Model', description: 'Entry based on range expansion model', color: '#FF5722' },
    { name: 'Range Contraction + Expansion Model', description: 'Entry combining contraction and expansion models', color: '#795548' },
    { name: 'Turnaround Thursday', description: 'Entry based on Thursday turnaround pattern', color: '#9E9E9E' },
    { name: 'WDR Rejection', description: 'Entry on WDR rejection', color: '#607D8B' },
    { name: 'Monkey', description: 'Entry based on Monkey pattern', color: '#9C27B0' },
    { name: 'Goldfish', description: 'Entry based on Goldfish pattern', color: '#E91E63' }
  ],
  
  confluences: [
    { name: 'Weekly DRCs' },
    { name: 'Weekly DRC Open' },
    { name: 'Weekly DRC Mid' },
    { name: 'Other DRCs (DR, IDR, Mid, Open)' },
    { name: 'DR Open Price' },
    { name: 'DR Mid Price' },
    { name: 'Upside Expansion' },
    { name: 'Downside Expansion' },
    { name: 'Range Expansion' },
    { name: 'Contraction Model' },
    { name: 'ASS Direction' },
    { name: 'Opening Gap' },
    { name: 'Open/Magnetic VIB/GIB' },
    { name: 'Turnaround Thursday' },
    { name: 'Respected VIB/GIB' },
    { name: 'Time' },
    { name: 'Retracement Cluster' },
    { name: 'Confirmation Candle not broken yet' },
    { name: 'Outside M7 Box' },
    { name: 'Tick Grid Divergence' },
    { name: 'DR Close Price' },
    { name: 'M7IB Special' },
    { name: '7IB' }
  ],
  
  accounts: [
    { name: 'Demo Account', size: 10000, percentEqualingOneR: 1, color: '#4CAF50' }
  ],
  
  app_settings: [
    { key: 'minimumConfluencesRequired', value: '3' }
  ]
};