// src/services/database/schema.js

export const schema = `
-- Settings tables
CREATE TABLE IF NOT EXISTS instruments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    tickValue REAL NOT NULL,
    color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS entry_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    size REAL NOT NULL,
    percentEqualingOneR REAL NOT NULL,
    color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS confluences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL
);

-- Filters table for saved filters
CREATE TABLE IF NOT EXISTS filters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    criteria TEXT NOT NULL,
    type TEXT NOT NULL
);

-- Backtests table
CREATE TABLE IF NOT EXISTS backtests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    day TEXT NOT NULL,
    confirmation_time TEXT NOT NULL,
    entry_time TEXT NOT NULL,
    instrument_id INTEGER NOT NULL,
    confirmation_type TEXT NOT NULL,
    direction TEXT NOT NULL,
    session TEXT NOT NULL,
    entry_method_id INTEGER,
    stopped_out BOOLEAN NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    ret_entry REAL,
    sd_exit REAL,
    entry REAL,
    stop REAL,
    target REAL,
    exit REAL,
    stop_ticks REAL,
    pot_result REAL,
    result REAL,
    preparation INTEGER,
    entry_score INTEGER,
    stop_loss INTEGER,
    target_score INTEGER,
    management INTEGER,
    rules INTEGER,
    average REAL,
    is_planned BOOLEAN NOT NULL DEFAULT 0,
    is_backtest BOOLEAN NOT NULL DEFAULT 0,
    backtest_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trade documentation table
CREATE TABLE IF NOT EXISTS trade_journal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_id INTEGER NOT NULL,
    journal_text TEXT,
    tradingview_link TEXT,
    body_mind_state TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for trade-confluence relationships
CREATE TABLE IF NOT EXISTS trade_confluences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_id INTEGER NOT NULL,
    confluence_id INTEGER NOT NULL
);

-- Playbooks table
CREATE TABLE IF NOT EXISTS playbooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instrument_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    day TEXT NOT NULL,
    direction TEXT NOT NULL,
    confirmation_time TEXT NOT NULL,
    mode_time_start TEXT,
    mode_time_end TEXT,
    time_cl_1_start TEXT,
    time_cl_1_end TEXT,
    ret_median_time TEXT,
    dropoff_time TEXT,
    ret_cluster_1_start REAL,
    ret_cluster_1_end REAL,
    ret_cluster_2_start REAL,
    ret_cluster_2_end REAL,
    ret_cluster_3_start REAL,
    ret_cluster_3_end REAL,
    ext_median_time TEXT,
    ext_cluster_1_start REAL,
    ext_cluster_1_end REAL,
    ext_cluster_2_start REAL,
    ext_cluster_2_end REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;