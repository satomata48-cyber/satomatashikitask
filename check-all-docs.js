import Database from 'better-sqlite3';

const db = new Database('local.db');

console.log('=== All Documents ===\n');
const docs = db.prepare('SELECT * FROM documents ORDER BY id').all();

docs.forEach(doc => {
	console.log(`ID: ${doc.id}`);
	console.log(`Card ID: ${doc.card_id}`);
	console.log(`Title: ${doc.title}`);
	console.log(`Content (first 100 chars): ${doc.content ? doc.content.substring(0, 100) : 'NULL'}`);
	console.log(`Parent ID: ${doc.parent_id}`);
	console.log(`Created: ${doc.created_at}`);
	console.log(`Updated: ${doc.updated_at}`);
	console.log('---');
});

console.log(`\nTotal documents: ${docs.length}`);

db.close();
