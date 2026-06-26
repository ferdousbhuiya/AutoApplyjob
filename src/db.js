const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'autoapply.db');

let db = null;

function initDb() {
  return new Promise((resolve, reject) => {
    try {
      db = new Database(DB_PATH);
      db.pragma('journal_mode = WAL');

      db.exec(`
        CREATE TABLE IF NOT EXISTS jobs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email_id TEXT UNIQUE,
          job_title TEXT,
          company TEXT,
          recruiter_email TEXT,
          job_description TEXT,
          source TEXT,
          detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'pending',
          fit_score INTEGER,
          fit_reason TEXT
        );

        CREATE TABLE IF NOT EXISTS drafts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          job_id INTEGER REFERENCES jobs(id),
          tailored_resume TEXT,
          cover_letter TEXT,
          gmail_draft_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          sent_at DATETIME
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);

      resolve(db);
    } catch (err) {
      reject(err);
    }
  });
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

module.exports = { initDb, getDb };
