import Database from 'better-sqlite3';

const db = new Database('local.db');

console.log('Creating documents table...');

try {
	db.prepare(`
		CREATE TABLE IF NOT EXISTS documents (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			card_id INTEGER NOT NULL,
			content TEXT DEFAULT '',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
		)
	`).run();
	console.log('✓ Created documents table');
} catch (e) {
	console.log('⚠ Documents table might already exist');
}

console.log('\nVerifying schema...');
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='documents'").get();
console.log(schema);

db.close();
console.log('\nDone!');
