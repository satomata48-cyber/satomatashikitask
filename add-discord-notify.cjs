const Database = require('better-sqlite3');
const db = new Database('local.db');

console.log('Adding discord_notify column to cards table...');

try {
  db.exec(`
    ALTER TABLE cards ADD COLUMN discord_notify INTEGER DEFAULT 0;
    CREATE INDEX IF NOT EXISTS idx_cards_discord_notify ON cards(discord_notify);
  `);
  console.log('✅ Migration completed successfully');
} catch (e) {
  if (e.message.includes('duplicate column name')) {
    console.log('⚠️  Column already exists, skipping...');
  } else {
    console.error('❌ Error:', e.message);
  }
}

// Verify the schema
console.log('\n=== CARDS TABLE SCHEMA ===');
const schema = db.prepare('PRAGMA table_info(cards)').all();
console.log(schema);

db.close();
