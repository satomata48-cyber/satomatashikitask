import Database from 'better-sqlite3';

const db = new Database('local.db');

console.log('=== Current documents table schema ===');
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='documents'").get();
console.log(schema);

console.log('\n=== Adding board_id column to documents table ===');
try {
	// Add board_id column (nullable, for board documents)
	db.prepare('ALTER TABLE documents ADD COLUMN board_id INTEGER').run();
	console.log('✅ Added board_id column');
} catch (err) {
	if (err.message.includes('duplicate column')) {
		console.log('⚠️  board_id column already exists');
	} else {
		console.error('❌ Error:', err);
	}
}

console.log('\n=== Updated schema ===');
const newSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='documents'").get();
console.log(newSchema);

db.close();
console.log('\n✅ Done!');
