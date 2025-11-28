const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');

const fs = require('fs');
const files = fs.readdirSync(dbPath);
const dbFile = files.find(f => f.endsWith('.sqlite'));

if (!dbFile) {
  console.error('Database file not found');
  process.exit(1);
}

const db = new Database(path.join(dbPath, dbFile));

// タグ用のカラムを追加（JSON形式で保存: [{name: "タグ名", color: "#色"}]）
try {
  db.exec(`ALTER TABLE cards ADD COLUMN tags TEXT DEFAULT '[]'`);
  console.log('Added tags column to cards table');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('tags column already exists');
  } else {
    throw e;
  }
}

db.close();
console.log('Done!');
