// src/components/trades/EntryHeatmap.jsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tooltip as MuiTooltip, 
  Grid
} from '@mui/material';

const EntryHeatmap = ({ entryTimeData, session }) => {
  const [heatmapData, setHeatmapData] = useState([]);
  const [bestEntryTime, setBestEntryTime] = useState(null);
  
  useEffect(() => {
    // Generate all possible entry times based on session
    let allTimes = [];
    
    if (session === 'ODR') {
      // 4:00-8:25
      for (let hour = 4; hour <= 8; hour++) {
        for (let minute = 0; minute < 60; minute += 5) {
          if (hour === 8 && minute > 25) break;
          
          const formattedHour = hour.toString().padStart(2, '0');
          const formattedMinute = minute.toString().padStart(2, '0');
          allTimes.push(`${formattedHour}:${formattedMinute}`);
        }
      }
    } else if (session === 'RDR') {
      // 10:30-15:55
      for (let hour = 10; hour <= 15; hour++) {
        for (let minute = 0; minute < 60; minute += 5) {
          if (hour === 10 && minute < 30) continue;
          if (hour === 15 && minute > 55) break;
          
          const formattedHour = hour.toString().padStart(2, '0');
          const formattedMinute = minute.toString().padStart(2, '0');
          allTimes.push(`${formattedHour}:${formattedMinute}`);
        }
      }
    }
    
    // Map entry time data to all possible times
    const mappedData = allTimes.map(time => {
      const timeData = entryTimeData.find(d => d.entry_time === time);
      return {
        time,
        count: timeData ? timeData.count : 0,
        winrate: timeData ? timeData.winrate : 0,
        total_result: timeData ? timeData.total_result : 0
      };
    });
    
    setHeatmapData(mappedData);
    
    // Find best entry time (highest total_result)
    if (entryTimeData.length > 0) {
      const bestTime = entryTimeData.reduce((best, current) => 
        (current.total_result > best.total_result) ? current : best
      );
      setBestEntryTime(bestTime.entry_time);
    } else {
      setBestEntryTime(null);
    }
    
  }, [entryTimeData, session]);
  
  // Helper to determine color intensity based on performance
  const getCellColor = (data) => {
    if (data.count === 0) return '#f5f5f5'; // Light gray for no data
    
    // For positive results, use blue scale
    if (data.total_result >= 0) {
      const intensity = Math.min(1, data.total_result / 10); // Scale up to 10R
      return `rgba(25, 118, 210, ${intensity})`;
    } 
    // For negative results, use red scale
    else {
      const intensity = Math.min(1, Math.abs(data.total_result) / 10); // Scale up to -10R
      return `rgba(244, 67, 54, ${intensity})`;
    }
  };
  
  // Group times by hour for better visualization
  const groupedByHour = {};
  heatmapData.forEach(data => {
    const hour = data.time.split(':')[0];
    if (!groupedByHour[hour]) {
      groupedByHour[hour] = [];
    }
    groupedByHour[hour].push(data);
  });
  
  return (
    <Box>
      {Object.keys(groupedByHour).length === 0 ? (
        <Typography variant="body2" color="text.secondary" align="center">
          No entry time data available.
        </Typography>
      ) : (
        <>
          <Grid container spacing={1} sx={{ mb: 2 }}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Entry Time Heatmap:
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Darker blue indicates better performance, darker red indicates worse performance
              </Typography>
            </Grid>
          </Grid>
          
          {Object.entries(groupedByHour).map(([hour, times]) => (
            <Box key={hour} sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ display: 'inline-block', width: '30px', mr: 1 }}>
                {hour}:
              </Typography>
              <Box sx={{ display: 'inline-flex', flexWrap: 'wrap' }}>
                {times.map((data) => {
                  const minute = data.time.split(':')[1];
                  return (
                    <MuiTooltip
                      key={data.time}
                      title={
                        data.count > 0 ? 
                        <>
                          <Typography variant="body2">Time: {data.time}</Typography>
                          <Typography variant="body2">Count: {data.count} trades</Typography>
                          <Typography variant="body2">Win Rate: {data.winrate}%</Typography>
                          <Typography variant="body2">Result: {data.total_result.toFixed(2)}R</Typography>
                          {bestEntryTime === data.time && (
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                              Best Entry Time!
                            </Typography>
                          )}
                        </> : 
                        `No trades at ${data.time}`
                      }
                    >
                      <Paper
                        sx={{
                          width: 20,
                          height: 20,
                          m: '2px',
                          bgcolor: getCellColor(data),
                          border: bestEntryTime === data.time ? '2px solid #4caf50' : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="caption" sx={{ fontSize: '8px', color: data.count > 0 ? 'white' : 'transparent' }}>
                          {minute}
                        </Typography>
                      </Paper>
                    </MuiTooltip>
                  );
                })}
              </Box>
            </Box>
          ))}
          
          {bestEntryTime && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="primary">
                Best Entry Time: {bestEntryTime}
              </Typography>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default EntryHeatmap;