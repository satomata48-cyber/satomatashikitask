const Database = require('better-sqlite3');
const db = new Database('local.db');

console.log('=== CARDS TABLE ===');
const cardsSchema = db.prepare('PRAGMA table_info(cards)').all();
console.log(cardsSchema);

console.log('\n=== USERS TABLE ===');
const usersSchema = db.prepare('PRAGMA table_info(users)').all();
console.log(usersSchema);

console.log('\n=== DOCUMENTS TABLE ===');
try {
  const documentsSchema = db.prepare('PRAGMA table_info(documents)').all();
  console.log(documentsSchema);
} catch (e) {
  console.log('documents table does not exist');
}

console.log('\n=== ALL TABLES ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables);

db.close();
