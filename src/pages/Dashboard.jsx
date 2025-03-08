// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Box, Grid, Typography, Card, CardContent, CircularProgress } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { executeQuery } from '../services/database/db';

// KPI Card Component
const KpiCard = ({ title, primaryValue, secondaryValue, color = 'primary' }) => {
  const getColorHex = (colorName) => {
    const colors = {
      primary: '#3f51b5',
      success: '#4caf50',
      error: '#f44336',
      warning: '#ff9800',
      info: '#2196f3'
    };
    return colors[colorName] || colors.primary;
  };
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" component="div" sx={{ color: getColorHex(color) }}>
          {primaryValue}
        </Typography>
        {secondaryValue && (
          <Typography variant="body2" color="text.secondary">
            {secondaryValue}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kpiData, setKpiData] = useState({
    totalTrades: 0,
    totalR: 0,
    winners: 0,
    winnersLast7Days: 0,
    expenses: 0,
    expensesLast7Days: 0,
    breakEvens: 0,
    breakEvensLast7Days: 0,
    chickenOuts: 0,
    missedR: 0,
    winrate: 0,
    averageWin: 0,
    averageMetrics: 0
  });
  const [weeklyMetrics, setWeeklyMetrics] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Get total number of trades and total result in R
        const totalTradesResult = executeQuery(`
          SELECT COUNT(*) as totalTrades, SUM(result) as totalR
          FROM trades
        `);
        
        const totalTrades = Array.isArray(totalTradesResult) && totalTradesResult.length > 0 
          ? totalTradesResult[0]?.totalTrades || 0 
          : 0;
          
        const totalR = Array.isArray(totalTradesResult) && totalTradesResult.length > 0 
          ? parseFloat(totalTradesResult[0]?.totalR || 0).toFixed(2) 
          : 0;
        
        // Use current date to calculate last 7 days
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
        
        // Get status counts (winners, expenses, break evens)
        let winners = 0, expenses = 0, breakEvens = 0;
        let winnersLast7Days = 0, expensesLast7Days = 0, breakEvensLast7Days = 0;
        
        // Fetch all trades to calculate status counts
        const tradesResult = executeQuery(`
          SELECT status, date FROM trades
        `);
        
        if (Array.isArray(tradesResult)) {
          tradesResult.forEach(trade => {
            if (trade.status === 'Winner') {
              winners++;
              if (trade.date >= sevenDaysAgoStr) winnersLast7Days++;
            } else if (trade.status === 'Expense') {
              expenses++;
              if (trade.date >= sevenDaysAgoStr) expensesLast7Days++;
            } else if (trade.status === 'Break Even') {
              breakEvens++;
              if (trade.date >= sevenDaysAgoStr) breakEvensLast7Days++;
            }
          });
        }
        
        // Get chicken outs (Exit < Target and Stopped Out is False)
        let chickenOuts = 0, missedR = 0;
        
        // Fetch trades for chicken outs
        const chickenOutsResult = executeQuery(`
          SELECT * FROM trades WHERE exit < target AND stopped_out = 0
        `);
        
        if (Array.isArray(chickenOutsResult)) {
          chickenOutsResult.forEach(trade => {
            chickenOuts++;
            missedR += (trade.target - trade.exit) / (trade.entry - trade.stop);
          });
        }
        
        // Calculate winrate
        const winrate = totalTrades > 0 ? (winners / totalTrades * 100).toFixed(1) : 0;
        
        // Calculate average win
        let totalWinR = 0, winCount = 0;
        
        // Fetch winning trades
        const winningTradesResult = executeQuery(`
          SELECT result FROM trades WHERE status = 'Winner'
        `);
        
        if (Array.isArray(winningTradesResult)) {
          winningTradesResult.forEach(trade => {
            if (trade.result) {
              totalWinR += parseFloat(trade.result);
              winCount++;
            }
          });
        }
        
        const averageWin = winCount > 0 ? (totalWinR / winCount).toFixed(2) : 0;
        
        // Calculate average metrics
        let totalMetrics = 0, metricsCount = 0;
        
        // Fetch trades with metrics
        const metricTradesResult = executeQuery(`
          SELECT preparation, entry_score, stop_loss, target_score, management, rules FROM trades
        `);
        
        if (Array.isArray(metricTradesResult)) {
          metricTradesResult.forEach(trade => {
            const scores = [
              trade.preparation,
              trade.entry_score,
              trade.stop_loss,
              trade.target_score,
              trade.management,
              trade.rules
            ].filter(score => score !== null && score !== undefined);
            
            if (scores.length > 0) {
              const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
              totalMetrics += avg;
              metricsCount++;
            }
          });
        }
        
        const averageMetrics = metricsCount > 0 ? (totalMetrics / metricsCount).toFixed(2) : 0;
        
        // Generate simple weekly metrics data
        // This is a simplified version since we don't have strftime() and complex SQL functions
        const tradesWithDate = executeQuery(`SELECT * FROM trades`);
        const weeklyData = {};
        
        if (Array.isArray(tradesWithDate)) {
          tradesWithDate.forEach(trade => {
            if (trade.date) {
              // Create a date object
              const date = new Date(trade.date);
              
              // Get ISO week number (simplified)
              const startOfYear = new Date(date.getFullYear(), 0, 1);
              const weekNumber = Math.ceil(((date - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
              
              // Format as YYYY-WW
              const yearWeek = `${date.getFullYear()}-${weekNumber}`;
              
              // Initialize if not exists
              if (!weeklyData[yearWeek]) {
                weeklyData[yearWeek] = {
                  tradeCount: 0,
                  totalScore: 0,
                  scoreCount: 0
                };
              }
              
              // Update counters
              weeklyData[yearWeek].tradeCount++;
              
              // Calculate average score
              const scores = [
                trade.preparation,
                trade.entry_score,
                trade.stop_loss,
                trade.target_score,
                trade.management,
                trade.rules
              ].filter(score => score !== null && score !== undefined);
              
              if (scores.length > 0) {
                const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
                weeklyData[yearWeek].totalScore += avg;
                weeklyData[yearWeek].scoreCount++;
              }
            }
          });
        }
        
        // Convert to array for chart
        const formattedWeeklyData = Object.entries(weeklyData)
          .map(([yearWeek, data]) => ({
            week: 'W' + yearWeek.split('-')[1],
            avgMetrics: data.scoreCount > 0 
              ? parseFloat(data.totalScore / data.scoreCount).toFixed(2) 
              : "0.00",
            tradeCount: data.tradeCount
          }))
          .sort((a, b) => a.week.localeCompare(b.week));
        
        setKpiData({
          totalTrades,
          totalR,
          winners,
          winnersLast7Days,
          expenses,
          expensesLast7Days,
          breakEvens,
          breakEvensLast7Days,
          chickenOuts,
          missedR: missedR.toFixed(2),
          winrate,
          averageWin,
          averageMetrics
        });
        
        setWeeklyMetrics(formattedWeeklyData);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err);
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error" variant="h6">
          Error: {error.message}
        </Typography>
      </Box>
    );
  }

  // Check if there are any trades
  const hasTrades = kpiData.totalTrades > 0;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      {!hasTrades ? (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" align="center">
              No trades recorded yet
            </Typography>
            <Typography variant="body1" align="center" color="text.secondary">
              Start by adding trades in the Trades or Backtest sections
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <KpiCard 
                title="Total Trades"
                primaryValue={kpiData.totalTrades}
                secondaryValue={`Total R: ${kpiData.totalR}`}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <KpiCard 
                title="Winners"
                primaryValue={kpiData.winners}
                secondaryValue={`Last 7 Days: ${kpiData.winnersLast7Days}`}
                color="success"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <KpiCard 
                title="Expenses"
                primaryValue={kpiData.expenses}
                secondaryValue={`Last 7 Days: ${kpiData.expensesLast7Days}`}
                color="error"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <KpiCard 
                title="Break Evens"
                primaryValue={kpiData.breakEvens}
                secondaryValue={`Last 7 Days: ${kpiData.breakEvensLast7Days}`}
                color="warning"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <KpiCard 
                title="Chicken Outs"
                primaryValue={kpiData.chickenOuts}
                secondaryValue={`Missed R: ${kpiData.missedR}`}
                color="info"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <KpiCard 
                title="Winrate"
                primaryValue={`${kpiData.winrate}%`}
                secondaryValue={`(${kpiData.totalTrades} trades)`}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <KpiCard 
                title="Average Win"
                primaryValue={`${kpiData.averageWin}R`}
                color="success"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <KpiCard 
                title="Avg Metrics"
                primaryValue={kpiData.averageMetrics}
                secondaryValue={`(${kpiData.totalTrades} trades)`}
                color="primary"
              />
            </Grid>
          </Grid>
          
          {/* Weekly Metrics Chart */}
          {weeklyMetrics.length > 0 && (
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Weekly Metrics Score
                </Typography>
                <Box sx={{ height: 400, width: '100%' }}>
                  <ResponsiveContainer>
                    <LineChart
                      data={weeklyMetrics}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis 
                        yAxisId="left"
                        domain={[0, 10]} 
                        label={{ value: 'Avg Score', angle: -90, position: 'insideLeft' }}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        label={{ value: 'Trade Count', angle: 90, position: 'insideRight' }}
                      />
                      <Tooltip 
                        formatter={(value, name) => [
                          value, 
                          name === 'avgMetrics' ? 'Average Metrics' : 'Trade Count'
                        ]}
                        labelFormatter={(label) => `Week: ${label}`}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="avgMetrics" 
                        name="Average Metrics Score" 
                        stroke="#8884d8" 
                        yAxisId="left"
                        activeDot={{ r: 8 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="tradeCount" 
                        name="Number of Trades" 
                        stroke="#82ca9d" 
                        yAxisId="right"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Box>
  );
};

export default Dashboard;