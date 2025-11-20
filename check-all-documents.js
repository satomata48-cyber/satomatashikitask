import Database from 'better-sqlite3';

const db = new Database('local.db');

console.log('Checking ALL documents...\n');

const docs = db.prepare('SELECT id, card_id, title, content, parent_id, created_at, updated_at FROM documents ORDER BY card_id, id').all();

console.log(`Found ${docs.length} total documents:\n`);

docs.forEach(doc => {
	console.log('---');
	console.log(`ID: ${doc.id}`);
	console.log(`Card ID: ${doc.card_id}`);
	console.log(`Title: ${doc.title}`);
	console.log(`Parent ID: ${doc.parent_id}`);
	console.log(`Content length: ${doc.content ? doc.content.length : 0} characters`);
	console.log(`Content: ${doc.content || '(empty)'}`);
	console.log(`Created: ${doc.created_at}`);
	console.log(`Updated: ${doc.updated_at}`);
});

db.close();
console.log('\nDone!');
