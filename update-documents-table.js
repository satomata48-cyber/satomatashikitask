import Database from 'better-sqlite3';

const db = new Database('local.db');

console.log('Updating documents table...');

try {
	// タイトルカラムを追加
	db.prepare('ALTER TABLE documents ADD COLUMN title TEXT DEFAULT "無題のドキュメント"').run();
	console.log('✓ Added title column');
} catch (e) {
	console.log('⚠ Title column might already exist');
}

// card_idのUNIQUE制約を削除するために、新しいテーブルを作成して移行
console.log('\nRemoving UNIQUE constraint from card_id...');

try {
	// 既存のデータをバックアップ
	const existingDocs = db.prepare('SELECT * FROM documents').all();

	// 古いテーブルを削除
	db.prepare('DROP TABLE IF EXISTS documents_old').run();
	db.prepare('ALTER TABLE documents RENAME TO documents_old').run();

	// 新しいテーブルを作成（UNIQUE制約なし）
	db.prepare(`
		CREATE TABLE documents (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			card_id INTEGER NOT NULL,
			title TEXT DEFAULT '無題のドキュメント',
			content TEXT DEFAULT '',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
		)
	`).run();

	// データを戻す
	if (existingDocs.length > 0) {
		const insert = db.prepare('INSERT INTO documents (id, card_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
		for (const doc of existingDocs) {
			insert.run(doc.id, doc.card_id, doc.title || '無題のドキュメント', doc.content, doc.created_at, doc.updated_at);
		}
	}

	// 古いテーブルを削除
	db.prepare('DROP TABLE documents_old').run();

	console.log('✓ Successfully migrated documents table');
} catch (e) {
	console.error('Error during migration:', e);
}

console.log('\nVerifying schema...');
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='documents'").get();
console.log(schema);

console.log('\nCurrent documents:');
const docs = db.prepare('SELECT * FROM documents').all();
console.log(docs);

db.close();
console.log('\nDone!');
