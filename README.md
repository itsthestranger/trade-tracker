# Trade Tracker Application

A comprehensive trade backtesting, tracking, review, and journaling application built with React and SQLite for local data storage.

## Features

- **Dashboard**: Visualize key performance indicators (KPIs) based on all trades taken
- **Trades**: Track live trades with planning tools and documentation
- **Backtest**: Track and analyze backtested trades with detailed performance reports
- **Playbooks**: Set up playbooks per instrument with time and retracement clusters
- **Settings**: Configure instruments, entry methods, accounts, and confluences

## Technology Stack

- **Frontend**: React with Material UI components
- **Data Storage**: SQLite via SQL.js for local data persistence
- **Data Visualization**: Recharts for charts and data visualization
- **Routing**: React Router for navigation
- **State Management**: React Context API and hooks

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/trade-tracker.git
   cd trade-tracker
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view the application in your browser.

### Application Setup

1. First, go to the **Settings** page to configure:
   - Instruments (with name, tick value, and color)
   - Entry Methods
   - Trading Accounts
   - Confluences for trade analysis

2. Once Settings are configured, you can start using:
   - **Backtest** section to add and track backtested trades
   - **Trades** section for live trade planning and execution
   - **Playbooks** section to set up detailed trade patterns for instruments

3. The **Dashboard** will automatically populate with metrics as you add trades.

## Application Structure

The application consists of five main sections:

1. **Dashboard**: Shows KPIs like winrate, total R, average metrics scores, etc.
2. **Trades**: For tracking and planning live trades
3. **Backtest**: For recording and analyzing backtested trades
4. **Playbooks**: For setting up playbooks per instrument
5. **Settings**: For configuring the application

## Database

The application uses SQLite for local data storage with the following main tables:

- `instruments`: Trading instruments configuration
- `entry_methods`: Entry methods configuration
- `accounts`: Trading accounts configuration
- `confluences`: Confluences configuration
- `trades`: Records of both backtested and live trades
- `playbooks`: Playbook data per instrument
- `trade_journal`: Documentation for trades
- `trade_confluences`: Junction table linking trades to confluences
- `filters`: Saved filters for trade analysis

All data is stored locally in your browser using the IndexedDB API via localforage.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.