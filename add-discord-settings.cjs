const Database = require('better-sqlite3');
const db = new Database('local.db');

try {
  console.log('Creating board_discord_settings table...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS board_discord_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER NOT NULL,
      webhook_url TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      days_ahead INTEGER DEFAULT 3,
      cron_schedule TEXT NOT NULL DEFAULT '0 9 * * *',
      timezone TEXT DEFAULT 'Asia/Tokyo',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    );
  `);
  console.log('✓ board_discord_settings table created');

  console.log('Creating unique index on board_id...');
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_board_discord_board_id ON board_discord_settings(board_id);`);
  console.log('✓ Unique index created');

  // Check the schema
  const tableInfo = db.prepare('PRAGMA table_info(board_discord_settings)').all();
  console.log('\nboard_discord_settings table schema:');
  console.log(tableInfo);

  // Check indexes
  const indexes = db.prepare('PRAGMA index_list(board_discord_settings)').all();
  console.log('\nIndexes on board_discord_settings table:');
  console.log(indexes);

} catch (error) {
  console.error('Error:', error.message);
} finally {
  db.close();
}
