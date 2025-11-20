import Database from 'better-sqlite3';

const db = new Database('local.db');

console.log('Before update:');
const before = db.prepare('SELECT * FROM documents WHERE id = 3').get();
console.log(before);

console.log('\nAttempting update...');
const result = db.prepare(
	'UPDATE documents SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND card_id = ?'
).run('TEST TITLE', '<p>TEST CONTENT WITH EMOJI 😀</p>', 3, 2);

console.log('Update result:', result);
console.log('Changes:', result.changes);

console.log('\nAfter update:');
const after = db.prepare('SELECT * FROM documents WHERE id = 3').get();
console.log(after);

db.close();
