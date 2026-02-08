const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_DIR = process.env.NODE_ENV === 'production' ? '/tmp' : __dirname;
const DB_PATH = path.join(DB_DIR, 'pollcent.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db;
let SQL;

// better-sqlite3 호환 래퍼
function wrapDb(rawDb) {
  function saveToFile() {
    const data = rawDb.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }

  return {
    prepare(sql) {
      return {
        run(...params) {
          rawDb.run(sql, params);
          const changes = rawDb.getRowsModified();
          const lastId = rawDb.exec("SELECT last_insert_rowid() as id");
          const lastInsertRowid = lastId[0] ? lastId[0].values[0][0] : 0;
          saveToFile();
          return { changes, lastInsertRowid };
        },
        get(...params) {
          const stmt = rawDb.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            stmt.free();
            const row = {};
            cols.forEach((c, i) => row[c] = vals[i]);
            return row;
          }
          stmt.free();
          return undefined;
        },
        all(...params) {
          const results = [];
          const stmt = rawDb.prepare(sql);
          stmt.bind(params);
          while (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            const row = {};
            cols.forEach((c, i) => row[c] = vals[i]);
            results.push(row);
          }
          stmt.free();
          return results;
        },
      };
    },
    exec(sql) {
      rawDb.exec(sql);
      saveToFile();
    },
    pragma(str) {
      try { rawDb.exec('PRAGMA ' + str); } catch (e) { /* ignore */ }
    },
  };
}

async function initDb() {
  if (db) return db;
  const wasmPath = path.join(path.dirname(require.resolve('sql.js')), 'sql-wasm.wasm');
  SQL = await initSqlJs({
    locateFile: () => wasmPath,
  });

  let rawDb;
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    rawDb = new SQL.Database(buffer);
  } else {
    rawDb = new SQL.Database();
  }

  db = wrapDb(rawDb);
  db.pragma('foreign_keys = ON');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);

  return db;
}

function getDb() {
  if (!db) throw new Error('DB not initialized. Call initDb() first.');
  return db;
}

module.exports = { initDb, getDb };
