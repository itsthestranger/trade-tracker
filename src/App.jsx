// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CssBaseline, Drawer, AppBar, Toolbar, List, Typography, Divider, 
  ListItem, ListItemButton, ListItemIcon, ListItemText, IconButton, CircularProgress,
  Button, Alert } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  SwapVert as TradesIcon,
  History as BacktestIcon,
  Book as PlaybooksIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

// Pages
import Dashboard from './pages/Dashboard';
import Trades from './pages/Trades';
import Backtest from './pages/Backtest';
import Playbooks from './pages/Playbooks';
import Settings from './pages/Settings';

// Database
import { initDatabase } from './services/database/db';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: 'rgba(25, 118, 210, 0.08)',
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.12)',
            },
          },
        },
      },
    },
  },
});

const drawerWidth = 240;

const App = () => {
  const [open, setOpen] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initAttempt, setInitAttempt] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 900);
      if (window.innerWidth < 900) {
        setOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    // Initialize database when app loads
    const initApp = async () => {
      try {
        console.log('Initializing database...');
        setIsLoading(true);
        setError(null);
        
        await initDatabase();
        console.log('Database initialized successfully');
        
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize database:', err);
        setError(err.message || 'Unknown database error');
        setIsLoading(false);
      }
    };
    
    initApp();
  }, [initAttempt]);

  const toggleDrawer = () => {
    setOpen(!open);
  };

  const handleNavItemClick = (index) => {
    setSelectedIndex(index);
    if (isMobile) {
      setOpen(false);
    }
  };

  const handleRetry = () => {
    // Reset IndexedDB and retry initialization
    if (window.indexedDB) {
      try {
        window.indexedDB.deleteDatabase('trade-tracker-db');
        console.log("IndexedDB database deleted");
      } catch (err) {
        console.error("Error deleting IndexedDB database:", err);
      }
    }
    
    // Also clear localStorage as fallback
    try {
      localStorage.removeItem('tradeTrackerDB');
      console.log("localStorage database entry removed");
    } catch (err) {
      console.error("Error removing localStorage item:", err);
    }
    
    // Trigger re-initialization by updating the initAttempt counter
    setInitAttempt(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        height="100vh"
        flexDirection="column"
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Initializing Application...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        height="100vh"
        flexDirection="column"
        p={3}
      >
        <Alert severity="error" sx={{ mb: 3, width: '100%', maxWidth: 500 }}>
          <Typography variant="h6" gutterBottom>
            Error Initializing Application
          </Typography>
          <Typography variant="body1" paragraph>
            {error}
          </Typography>
          <Typography variant="body2">
            This may be due to a corrupted database or initialization issue.
          </Typography>
        </Alert>
        
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<RefreshIcon />}
          onClick={handleRetry}
        >
          Reset Database and Retry
        </Button>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Box sx={{ display: 'flex' }}>
          <CssBaseline />
          
          {/* App Bar */}
          <AppBar
            position="fixed"
            sx={{
              zIndex: theme => theme.zIndex.drawer + 1,
              transition: theme => theme.transitions.create(['width', 'margin'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
              ...(open && {
                width: `calc(100% - ${drawerWidth}px)`,
                marginLeft: `${drawerWidth}px`,
                transition: theme => theme.transitions.create(['width', 'margin'], {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
                }),
              }),
            }}
          >
            <Toolbar>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                onClick={toggleDrawer}
                edge="start"
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" noWrap component="div">
                Trade Tracker
              </Typography>
            </Toolbar>
          </AppBar>
          
          {/* Drawer */}
          <Drawer
            variant={isMobile ? "temporary" : "permanent"}
            open={open}
            onClose={toggleDrawer}
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
              },
            }}
          >
            <Toolbar />
            <Box sx={{ overflow: 'auto', mt: 2 }}>
              <List>
                <ListItem disablePadding>
                  <ListItemButton 
                    selected={selectedIndex === 0}
                    onClick={() => handleNavItemClick(0)}
                    component="a" 
                    href="/"
                  >
                    <ListItemIcon>
                      <DashboardIcon />
                    </ListItemIcon>
                    <ListItemText primary="Dashboard" />
                  </ListItemButton>
                </ListItem>
                
                <ListItem disablePadding>
                  <ListItemButton 
                    selected={selectedIndex === 1}
                    onClick={() => handleNavItemClick(1)}
                    component="a" 
                    href="/trades"
                  >
                    <ListItemIcon>
                      <TradesIcon />
                    </ListItemIcon>
                    <ListItemText primary="Trades" />
                  </ListItemButton>
                </ListItem>
                
                <ListItem disablePadding>
                  <ListItemButton 
                    selected={selectedIndex === 2}
                    onClick={() => handleNavItemClick(2)}
                    component="a" 
                    href="/backtest"
                  >
                    <ListItemIcon>
                      <BacktestIcon />
                    </ListItemIcon>
                    <ListItemText primary="Backtest" />
                  </ListItemButton>
                </ListItem>
                
                <ListItem disablePadding>
                  <ListItemButton 
                    selected={selectedIndex === 3}
                    onClick={() => handleNavItemClick(3)}
                    component="a" 
                    href="/playbooks"
                  >
                    <ListItemIcon>
                      <PlaybooksIcon />
                    </ListItemIcon>
                    <ListItemText primary="Playbooks" />
                  </ListItemButton>
                </ListItem>
                
                <Divider sx={{ my: 2 }} />
                
                <ListItem disablePadding>
                  <ListItemButton 
                    selected={selectedIndex === 4}
                    onClick={() => handleNavItemClick(4)}
                    component="a" 
                    href="/settings"
                  >
                    <ListItemIcon>
                      <SettingsIcon />
                    </ListItemIcon>
                    <ListItemText primary="Settings" />
                  </ListItemButton>
                </ListItem>
              </List>
            </Box>
          </Drawer>
          
          {/* Main Content */}
          <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
            <Toolbar /> {/* Spacer for AppBar */}
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/trades/*" element={<Trades />} />
              <Route path="/backtest/*" element={<Backtest />} />
              <Route path="/playbooks/*" element={<Playbooks />} />
              <Route path="/settings/*" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
};

export default App;