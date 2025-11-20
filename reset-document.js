import Database from 'better-sqlite3';

const db = new Database('local.db');

console.log('Resetting document to clean state...');

// Update document back to a clean state
db.prepare(
	'UPDATE documents SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
).run('sasami', '<p>ここからドキュメントを作成してください...</p>', 3);

console.log('\nDocument after reset:');
const doc = db.prepare('SELECT * FROM documents WHERE id = 3').get();
console.log(doc);

db.close();
console.log('\nDone!');
