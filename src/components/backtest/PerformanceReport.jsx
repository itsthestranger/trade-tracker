// src/components/backtest/PerformanceReport.jsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  CircularProgress,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab
} from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { executeQuery } from '../../services/database/db';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`report-tabpanel-${index}`}
      aria-labelledby={`report-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const PerformanceReport = ({ isBacktest = true, backtestId = null }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Report data
  const [overviewMetrics, setOverviewMetrics] = useState({
    totalTrades: 0,
    winRate: 0,
    winners: 0,
    expenses: 0,
    breakEven: 0,
    totalR: 0,
    avgR: 0,
    consecutiveWinners: 0,
    consecutiveExpenses: 0,
    consecutiveBreakEven: 0
  });
  
  const [averageScores, setAverageScores] = useState({
    preparation: 0,
    entry: 0,
    stopLoss: 0,
    target: 0,
    management: 0,
    rules: 0,
    overall: 0
  });
  
  const [resultsBySession, setResultsBySession] = useState([]);
  const [resultsByInstrument, setResultsByInstrument] = useState([]);
  const [resultsByConfirmationType, setResultsByConfirmationType] = useState([]);
  const [resultsByEntryMethod, setResultsByEntryMethod] = useState([]);
  const [resultsByDay, setResultsByDay] = useState([]);
  const [resultsByDirection, setResultsByDirection] = useState([]);
  const [resultsByMonth, setResultsByMonth] = useState([]);
  
  useEffect(() => {
    fetchReportData();
  }, [isBacktest, backtestId]);
  
  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      
      // Build base query conditions
      let conditions = "WHERE t.is_backtest = ?";
      let params = [isBacktest ? 1 : 0];
      
      if (isBacktest && backtestId) {
        conditions += " AND t.backtest_id = ?";
        params.push(backtestId);
      }
      
      // Overview metrics
      const overviewResult = executeQuery(`
        SELECT 
          COUNT(*) as totalTrades,
          ROUND(AVG(CASE WHEN status = 'Winner' THEN 100 ELSE 0 END), 1) as winRate,
          COUNT(CASE WHEN status = 'Winner' THEN 1 END) as winners,
          COUNT(CASE WHEN status = 'Expense' THEN 1 END) as expenses,
          COUNT(CASE WHEN status = 'Break Even' THEN 1 END) as breakEven,
          ROUND(SUM(result), 2) as totalR,
          ROUND(AVG(result), 2) as avgR
        FROM trades t
        ${conditions}
      `, params);
      
      // Average scores
      const scoresResult = executeQuery(`
        SELECT 
          ROUND(AVG(preparation), 1) as preparation,
          ROUND(AVG(entry_score), 1) as entry,
          ROUND(AVG(stop_loss), 1) as stopLoss,
          ROUND(AVG(target_score), 1) as target,
          ROUND(AVG(management), 1) as management,
          ROUND(AVG(rules), 1) as rules,
          ROUND(AVG(average), 1) as overall
        FROM trades t
        ${conditions}
      `, params);
      
      // Results by session
      const sessionResult = executeQuery(`
        SELECT 
          session,
          COUNT(*) as trades,
          ROUND(AVG(CASE WHEN status = 'Winner' THEN 100 ELSE 0 END), 1) as winrate,
          COUNT(CASE WHEN status = 'Winner' THEN 1 END) as winners,
          COUNT(CASE WHEN status = 'Expense' THEN 1 END) as expenses,
          COUNT(CASE WHEN status = 'Break Even' THEN 1 END) as breakEven,
          ROUND(SUM(result), 2) as result
        FROM trades t
        ${conditions}
        GROUP BY session
        ORDER BY session
      `, params);
      
      // Results by instrument
      const instrumentResult = executeQuery(`
        SELECT 
          i.name as instrument,
          COUNT(*) as trades,
          ROUND(AVG(CASE WHEN status = 'Winner' THEN 100 ELSE 0 END), 1) as winrate,
          COUNT(CASE WHEN status = 'Winner' THEN 1 END) as winners,
          COUNT(CASE WHEN status = 'Expense' THEN 1 END) as expenses,
          COUNT(CASE WHEN status = 'Break Even' THEN 1 END) as breakEven,
          ROUND(SUM(result), 2) as result
        FROM trades t
        JOIN instruments i ON t.instrument_id = i.id
        ${conditions}
        GROUP BY t.instrument_id
        ORDER BY trades DESC
      `, params);
      
      // Results by confirmation type
      const confirmationResult = executeQuery(`
        SELECT 
          confirmation_type as confirmationType,
          COUNT(*) as trades,
          ROUND(AVG(CASE WHEN status = 'Winner' THEN 100 ELSE 0 END), 1) as winrate,
          COUNT(CASE WHEN status = 'Winner' THEN 1 END) as winners,
          COUNT(CASE WHEN status = 'Expense' THEN 1 END) as expenses,
          COUNT(CASE WHEN status = 'Break Even' THEN 1 END) as breakEven,
          ROUND(SUM(result), 2) as result
        FROM trades t
        ${conditions}
        GROUP BY confirmation_type
        ORDER BY trades DESC
      `, params);
      
      // Results by entry method
      const entryMethodResult = executeQuery(`
        SELECT 
          e.name as entryMethod,
          COUNT(*) as trades,
          ROUND(AVG(CASE WHEN status = 'Winner' THEN 100 ELSE 0 END), 1) as winrate,
          COUNT(CASE WHEN status = 'Winner' THEN 1 END) as winners,
          COUNT(CASE WHEN status = 'Expense' THEN 1 END) as expenses,
          COUNT(CASE WHEN status = 'Break Even' THEN 1 END) as breakEven,
          ROUND(SUM(result), 2) as result
        FROM trades t
        JOIN entry_methods e ON t.entry_method_id = e.id
        ${conditions}
        GROUP BY t.entry_method_id
        ORDER BY trades DESC
      `, params);
      
      // Results by day
      const dayResult = executeQuery(`
        SELECT 
          day,
          COUNT(*) as trades,
          ROUND(AVG(CASE WHEN status = 'Winner' THEN 100 ELSE 0 END), 1) as winrate,
          COUNT(CASE WHEN status = 'Winner' THEN 1 END) as winners,
          COUNT(CASE WHEN status = 'Expense' THEN 1 END) as expenses,
          COUNT(CASE WHEN status = 'Break Even' THEN 1 END) as breakEven,
          ROUND(SUM(result), 2) as result
        FROM trades t
        ${conditions}
        GROUP BY day
        ORDER BY 
          CASE 
            WHEN day = 'Mon' THEN 1 
            WHEN day = 'Tue' THEN 2 
            WHEN day = 'Wed' THEN 3 
            WHEN day = 'Thu' THEN 4 
            WHEN day = 'Fri' THEN 5 
          END
      `, params);
      
      // Results by direction
      const directionResult = executeQuery(`
        SELECT 
          direction,
          COUNT(*) as trades,
          ROUND(AVG(CASE WHEN status = 'Winner' THEN 100 ELSE 0 END), 1) as winrate,
          COUNT(CASE WHEN status = 'Winner' THEN 1 END) as winners,
          COUNT(CASE WHEN status = 'Expense' THEN 1 END) as expenses,
          COUNT(CASE WHEN status = 'Break Even' THEN 1 END) as breakEven,
          ROUND(SUM(result), 2) as result
        FROM trades t
        ${conditions}
        GROUP BY direction
        ORDER BY direction
      `, params);
      
      // Results by month
      const monthResult = executeQuery(`
        SELECT 
          strftime('%Y-%m', date) as month,
          COUNT(*) as trades,
          ROUND(AVG(CASE WHEN status = 'Winner' THEN 100 ELSE 0 END), 1) as winrate,
          COUNT(CASE WHEN status = 'Winner' THEN 1 END) as winners,
          COUNT(CASE WHEN status = 'Expense' THEN 1 END) as expenses,
          COUNT(CASE WHEN status = 'Break Even' THEN 1 END) as breakEven,
          ROUND(SUM(result), 2) as result
        FROM trades t
        ${conditions}
        GROUP BY strftime('%Y-%m', date)
        ORDER BY month DESC
      `, params);
      
      // Calculate consecutive winners/expenses
      const tradeSequenceResult = executeQuery(`
        SELECT status FROM trades t
        ${conditions}
        ORDER BY date, confirmation_time
      `, params);
      
      let maxConsecutiveWinners = 0;
      let maxConsecutiveExpenses = 0;
      let maxConsecutiveBreakEven = 0;
      let currentWinners = 0;
      let currentExpenses = 0;
      let currentBreakEven = 0;
      
      tradeSequenceResult.forEach(trade => {
        if (trade.status === 'Winner') {
          currentWinners++;
          currentExpenses = 0;
          currentBreakEven = 0;
          maxConsecutiveWinners = Math.max(maxConsecutiveWinners, currentWinners);
        } else if (trade.status === 'Expense') {
          currentExpenses++;
          currentWinners = 0;
          currentBreakEven = 0;
          maxConsecutiveExpenses = Math.max(maxConsecutiveExpenses, currentExpenses);
        } else { // Break Even
          currentBreakEven++;
          currentWinners = 0;
          currentExpenses = 0;
          maxConsecutiveBreakEven = Math.max(maxConsecutiveBreakEven, currentBreakEven);
        }
      });
      
      // Set the data
      setOverviewMetrics({
        ...overviewResult[0],
        consecutiveWinners: maxConsecutiveWinners,
        consecutiveExpenses: maxConsecutiveExpenses,
        consecutiveBreakEven: maxConsecutiveBreakEven
      });
      
      setAverageScores(scoresResult[0]);
      setResultsBySession(sessionResult);
      setResultsByInstrument(instrumentResult);
      setResultsByConfirmationType(confirmationResult);
      setResultsByEntryMethod(entryMethodResult);
      setResultsByDay(dayResult);
      setResultsByDirection(directionResult);
      setResultsByMonth(monthResult);
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err);
      setIsLoading(false);
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
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
  if (overviewMetrics.totalTrades === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" align="center">
            No trades available for performance analysis
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary">
            Add trades to see performance metrics
          </Typography>
        </CardContent>
      </Card>
    );
  }
  
  // Prepare pie chart data
  const statusDistributionData = [
    { name: 'Winners', value: overviewMetrics.winners, color: '#4caf50' },
    { name: 'Expenses', value: overviewMetrics.expenses, color: '#f44336' },
    { name: 'Break Even', value: overviewMetrics.breakEven, color: '#ff9800' }
  ].filter(item => item.value > 0);
  
  // Tabs for different result tables
  const resultTables = [
    { label: 'Session', data: resultsBySession },
    { label: 'Instrument', data: resultsByInstrument },
    { label: 'Confirmation Type', data: resultsByConfirmationType },
    { label: 'Entry Method', data: resultsByEntryMethod },
    { label: 'Day', data: resultsByDay },
    { label: 'Direction', data: resultsByDirection },
    { label: 'Month', data: resultsByMonth }
  ];
  
  return (
    <Box>
      <Grid container spacing={3}>
        {/* Performance Overview */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Overview
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={4}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Total Trades
                        </Typography>
                        <Typography variant="h5">
                          {overviewMetrics.totalTrades}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Win Rate
                        </Typography>
                        <Typography variant="h5" color="success.main">
                          {overviewMetrics.winRate}%
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Total Result
                        </Typography>
                        <Typography variant="h5" color={overviewMetrics.totalR >= 0 ? 'success.main' : 'error.main'}>
                          {overviewMetrics.totalR}R
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Average Result
                        </Typography>
                        <Typography variant="h5" color={overviewMetrics.avgR >= 0 ? 'success.main' : 'error.main'}>
                          {overviewMetrics.avgR}R
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Winners / Expenses
                        </Typography>
                        <Typography variant="h5">
                          {overviewMetrics.winners} / {overviewMetrics.expenses}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Break Even
                        </Typography>
                        <Typography variant="h5">
                          {overviewMetrics.breakEven}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Consecutive Winners
                        </Typography>
                        <Typography variant="h5" color="success.main">
                          {overviewMetrics.consecutiveWinners}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Consecutive Expenses
                        </Typography>
                        <Typography variant="h5" color="error.main">
                          {overviewMetrics.consecutiveExpenses}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Consecutive Break Even
                        </Typography>
                        <Typography variant="h5">
                          {overviewMetrics.consecutiveBreakEven}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item xs={12} md={4}>
                  {statusDistributionData.length > 0 && (
                    <Box height={200}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusDistributionData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {statusDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} trades`, 'Count']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Average Scores */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Average Scores
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Preparation
                    </Typography>
                    <Typography variant="h6">
                      {averageScores.preparation}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Entry
                    </Typography>
                    <Typography variant="h6">
                      {averageScores.entry}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Stop Loss
                    </Typography>
                    <Typography variant="h6">
                      {averageScores.stopLoss}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Target
                    </Typography>
                    <Typography variant="h6">
                      {averageScores.target}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Management
                    </Typography>
                    <Typography variant="h6">
                      {averageScores.management}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Rules
                    </Typography>
                    <Typography variant="h6">
                      {averageScores.rules}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      Overall Average
                    </Typography>
                    <Typography variant="h5" color="primary.main">
                      {averageScores.overall}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Results Overview */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Best Performers
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  {resultsByInstrument.length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Best Instrument
                      </Typography>
                      <Typography variant="h6">
                        {resultsByInstrument.sort((a, b) => b.result - a.result)[0]?.instrument || 'N/A'}
                        {' '}
                        <Typography component="span" color="success.main">
                          ({resultsByInstrument.sort((a, b) => b.result - a.result)[0]?.result || 0}R)
                        </Typography>
                      </Typography>
                    </Grid>
                  )}
                  
                  {resultsByEntryMethod.length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Best Entry Method
                      </Typography>
                      <Typography variant="h6">
                        {resultsByEntryMethod.sort((a, b) => b.result - a.result)[0]?.entryMethod || 'N/A'}
                        {' '}
                        <Typography component="span" color="success.main">
                          ({resultsByEntryMethod.sort((a, b) => b.result - a.result)[0]?.result || 0}R)
                        </Typography>
                      </Typography>
                    </Grid>
                  )}
                  
                  {resultsByDay.length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Best Day
                      </Typography>
                      <Typography variant="h6">
                        {resultsByDay.sort((a, b) => b.result - a.result)[0]?.day || 'N/A'}
                        {' '}
                        <Typography component="span" color="success.main">
                          ({resultsByDay.sort((a, b) => b.result - a.result)[0]?.result || 0}R)
                        </Typography>
                      </Typography>
                    </Grid>
                  )}
                  
                  {resultsBySession.length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Best Session
                      </Typography>
                      <Typography variant="h6">
                        {resultsBySession.sort((a, b) => b.result - a.result)[0]?.session || 'N/A'}
                        {' '}
                        <Typography component="span" color="success.main">
                          ({resultsBySession.sort((a, b) => b.result - a.result)[0]?.result || 0}R)
                        </Typography>
                      </Typography>
                    </Grid>
                  )}
                  
                  {resultsByConfirmationType.length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Best Confirmation Type
                      </Typography>
                      <Typography variant="h6">
                        {resultsByConfirmationType.sort((a, b) => b.result - a.result)[0]?.confirmationType || 'N/A'}
                        {' '}
                        <Typography component="span" color="success.main">
                          ({resultsByConfirmationType.sort((a, b) => b.result - a.result)[0]?.result || 0}R)
                        </Typography>
                      </Typography>
                    </Grid>
                  )}
                  
                  {resultsByDirection.length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Best Direction
                      </Typography>
                      <Typography variant="h6">
                        {resultsByDirection.sort((a, b) => b.result - a.result)[0]?.direction || 'N/A'}
                        {' '}
                        <Typography component="span" color="success.main">
                          ({resultsByDirection.sort((a, b) => b.result - a.result)[0]?.result || 0}R)
                        </Typography>
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Detailed Results */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Detailed Results
              </Typography>
              
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                  value={tabValue} 
                  onChange={handleTabChange} 
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  {resultTables.map((table, index) => (
                    <Tab key={index} label={table.label} />
                  ))}
                </Tabs>
              </Box>
              
              {resultTables.map((table, index) => (
                <TabPanel key={index} value={tabValue} index={index}>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>{table.label}</TableCell>
                          <TableCell align="right">Trades</TableCell>
                          <TableCell align="right">Win Rate</TableCell>
                          <TableCell align="right">Winners</TableCell>
                          <TableCell align="right">Expenses</TableCell>
                          <TableCell align="right">Break Even</TableCell>
                          <TableCell align="right">Result (R)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {table.data.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            <TableCell component="th" scope="row">
                              {Object.values(row)[0]}
                            </TableCell>
                            <TableCell align="right">{row.trades}</TableCell>
                            <TableCell align="right">{row.winrate}%</TableCell>
                            <TableCell align="right">{row.winners}</TableCell>
                            <TableCell align="right">{row.expenses}</TableCell>
                            <TableCell align="right">{row.breakEven}</TableCell>
                            <TableCell 
                              align="right"
                              sx={{ 
                                color: row.result > 0 ? 'success.main' : 
                                      row.result < 0 ? 'error.main' : 
                                      'text.primary'
                              }}
                            >
                              {row.result}
                            </TableCell>
                          </TableRow>
                        ))}
                        {table.data.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} align="center">
                              No data available
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </TabPanel>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PerformanceReport;