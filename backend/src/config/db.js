// src/config/db.js
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH
  ? path.join(__dirname, '..', '..', process.env.DB_PATH)
  : path.join(__dirname, '..', '..', 'database', 'dte.sqlite');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
