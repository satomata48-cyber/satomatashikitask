import Database from 'better-sqlite3';

const db = new Database('local.db');

console.log('=== Current documents table schema ===');
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='documents'").get();
console.log(schema);

console.log('\n=== Making card_id nullable ===');

try {
	// SQLiteではALTER TABLEでNULL制約を変更できないため、テーブルを再作成する必要があります

	// 1. 新しいテーブルを作成（card_idをNULLABLEにする）
	db.prepare(`
		CREATE TABLE documents_new (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			card_id INTEGER,
			title TEXT NOT NULL,
			content TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			parent_id INTEGER,
			board_id INTEGER,
			FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
			FOREIGN KEY (parent_id) REFERENCES documents(id) ON DELETE CASCADE
		)
	`).run();
	console.log('✅ Created new documents table with nullable card_id');

	// 2. 既存データをコピー
	db.prepare(`
		INSERT INTO documents_new (id, card_id, title, content, created_at, updated_at, parent_id, board_id)
		SELECT id, card_id, title, content, created_at, updated_at, parent_id, board_id
		FROM documents
	`).run();
	console.log('✅ Copied existing data');

	// 3. 古いテーブルを削除
	db.prepare('DROP TABLE documents').run();
	console.log('✅ Dropped old documents table');

	// 4. 新しいテーブルをリネーム
	db.prepare('ALTER TABLE documents_new RENAME TO documents').run();
	console.log('✅ Renamed new table to documents');

} catch (err) {
	console.error('❌ Error:', err);
	// エラーが発生した場合、documents_newテーブルが残っている可能性があるので削除を試みる
	try {
		db.prepare('DROP TABLE IF EXISTS documents_new').run();
	} catch (cleanupErr) {
		// cleanup失敗は無視
	}
	process.exit(1);
}

console.log('\n=== Updated schema ===');
const newSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='documents'").get();
console.log(newSchema);

console.log('\n=== Verifying data ===');
const count = db.prepare('SELECT COUNT(*) as count FROM documents').get();
console.log('Total documents:', count);

db.close();
console.log('\n✅ Done! card_id is now nullable.');
