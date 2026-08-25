// db/migrate.js — applies numbered SQL files from migrations/ in order,
// tracking what's already applied in schema_migrations. Safe to run
// repeatedly (idempotent): already-applied files are skipped.

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

function migrate(connection) {
  connection.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    TEXT PRIMARY KEY,
      applied_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  const applied = new Set(
    connection.prepare('SELECT filename FROM schema_migrations').all().map(r => r.filename)
  );

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    const runMigration = connection.transaction(() => {
      connection.exec(sql);
      connection.prepare('INSERT INTO schema_migrations (filename) VALUES (?)').run(file);
    });
    runMigration();
    console.log(`  [migrate] applied ${file}`);
  }
}

module.exports = { migrate };

if (require.main === module) {
  const Database = require('better-sqlite3');
  const DB_FILE = process.env.DATABASE_FILE || path.join(__dirname, '..', 'evo360.db');
  const connection = new Database(DB_FILE);
  connection.pragma('journal_mode = WAL');
  migrate(connection);
  connection.close();
  console.log(`  [migrate] up to date (${DB_FILE})`);
}
