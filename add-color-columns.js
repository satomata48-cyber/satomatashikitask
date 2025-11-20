import Database from 'better-sqlite3';

const db = new Database('local.db');

console.log('Adding new color columns to cards table...');

try {
	db.prepare('ALTER TABLE cards ADD COLUMN title_bg_color TEXT DEFAULT NULL').run();
	console.log('✓ Added title_bg_color column');
} catch (e) {
	console.log('⚠ title_bg_color column might already exist');
}

try {
	db.prepare('ALTER TABLE cards ADD COLUMN description_bg_color TEXT DEFAULT NULL').run();
	console.log('✓ Added description_bg_color column');
} catch (e) {
	console.log('⚠ description_bg_color column might already exist');
}

try {
	db.prepare('ALTER TABLE cards ADD COLUMN border_color TEXT DEFAULT NULL').run();
	console.log('✓ Added border_color column');
} catch (e) {
	console.log('⚠ border_color column might already exist');
}

console.log('\nVerifying schema...');
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='cards'").get();
console.log(schema);

db.close();
console.log('\nDone!');
