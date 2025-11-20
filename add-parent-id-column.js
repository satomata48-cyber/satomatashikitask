import Database from 'better-sqlite3';

const db = new Database('local.db');

console.log('Adding parent_id column to documents table...');

try {
	// parent_id列を追加
	db.prepare('ALTER TABLE documents ADD COLUMN parent_id INTEGER DEFAULT NULL').run();
	console.log('✓ Added parent_id column');
} catch (e) {
	console.log('⚠ Parent_id column might already exist');
}

console.log('\nVerifying schema...');
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='documents'").get();
console.log(schema);

console.log('\nCurrent documents:');
const docs = db.prepare('SELECT * FROM documents').all();
console.log(docs);

db.close();
console.log('\nDone!');
