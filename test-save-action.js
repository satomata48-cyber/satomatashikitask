import Database from 'better-sqlite3';

// Simulate the exact LocalD1Database wrapper from db.ts
class LocalD1PreparedStatement {
	constructor(stmt, db) {
		this.stmt = stmt;
		this.db = db;
	}

	bind(...values) {
		console.log('bind() called with:', values);
		this.stmt = this.stmt.bind(...values);
		console.log('Statement after bind:', this.stmt);
		return this;
	}

	async first(colName) {
		const result = this.stmt.get();
		if (!result) return null;
		if (colName && typeof result === 'object' && result !== null) {
			return result[colName];
		}
		return result;
	}

	async run() {
		const info = this.stmt.run();
		return {
			success: true,
			meta: {
				duration: 0,
				rows_read: info.changes,
				rows_written: info.changes,
				changes: info.changes
			},
			results: []
		};
	}
}

class TestLocalD1Database {
	constructor(dbPath) {
		this.db = new Database(dbPath);
	}

	prepare(query) {
		const stmt = this.db.prepare(query);
		return new LocalD1PreparedStatement(stmt, this.db);
	}
}

async function testSave() {
	const db = new TestLocalD1Database('local.db');

	console.log('=== Testing Save Action ===\n');

	const docId = 3;
	const cardId = 2;
	const title = 'テスト保存';
	const content = '<p>これはテスト内容です 😀</p>';

	console.log('Parameters:');
	console.log('  Doc ID:', docId);
	console.log('  Card ID:', cardId);
	console.log('  Title:', title);
	console.log('  Content:', content);
	console.log();

	console.log('Before update:');
	const before = await db.prepare('SELECT * FROM documents WHERE id = ?')
		.bind(docId)
		.first();
	console.log(before);
	console.log();

	console.log('Executing UPDATE...');
	const result = await db.prepare(
		'UPDATE documents SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND card_id = ?'
	)
		.bind(title, content, docId, cardId)
		.run();

	console.log('Update result:', result);
	console.log();

	console.log('After update:');
	const after = await db.prepare('SELECT * FROM documents WHERE id = ?')
		.bind(docId)
		.first();
	console.log(after);
	console.log();

	if (after.title === title && after.content === content) {
		console.log('✅ SAVE TEST PASSED - Data was saved correctly!');
	} else {
		console.log('❌ SAVE TEST FAILED - Data was NOT saved correctly!');
		console.log('Expected title:', title, 'Got:', after.title);
		console.log('Expected content:', content, 'Got:', after.content);
	}
}

testSave().catch(console.error);
