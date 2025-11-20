import Database from 'better-sqlite3';

const db = new Database('local.db');

console.log('=== Users ===');
const users = db.prepare('SELECT * FROM users').all();
console.log(users);

console.log('\n=== Boards ===');
const boards = db.prepare('SELECT * FROM boards').all();
console.log(boards);

console.log('\n=== Lists ===');
const lists = db.prepare('SELECT * FROM lists').all();
console.log(lists);

console.log('\n=== Cards ===');
const cards = db.prepare('SELECT * FROM cards').all();
console.log(cards);

console.log('\n=== Cards Table Schema ===');
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='cards'").get();
console.log(schema);

db.close();
