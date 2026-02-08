const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Render는 ephemeral filesystem이므로 /tmp 사용
const DB_DIR = process.env.NODE_ENV === 'production' ? '/tmp' : __dirname;
const DB_PATH = path.join(DB_DIR, 'pollcent.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schema);
  }
  return db;
}

module.exports = { getDb };
