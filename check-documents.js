import Database from 'better-sqlite3';

const db = new Database('local.db');

console.log('Checking documents for card_id = 2...\n');

const docs = db.prepare('SELECT id, card_id, title, content, parent_id, created_at, updated_at FROM documents WHERE card_id = 2').all();

console.log(`Found ${docs.length} documents:\n`);

docs.forEach(doc => {
	console.log('---');
	console.log(`ID: ${doc.id}`);
	console.log(`Card ID: ${doc.card_id}`);
	console.log(`Title: ${doc.title}`);
	console.log(`Parent ID: ${doc.parent_id}`);
	console.log(`Content length: ${doc.content ? doc.content.length : 0} characters`);
	console.log(`Content preview: ${doc.content ? doc.content.substring(0, 100) : '(empty)'}`);
	console.log(`Created: ${doc.created_at}`);
	console.log(`Updated: ${doc.updated_at}`);
});

db.close();
console.log('\nDone!');
