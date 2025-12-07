const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/09e33ed1-71a8-4791-b749-d70a0675eb9f.sqlite');
const migrationPath = path.join(__dirname, 'migrations/013_add_project_goals.sql');

if (!fs.existsSync(dbPath)) {
    console.error('データベースファイルが見つかりません:', dbPath);
    process.exit(1);
}

const db = new Database(dbPath);
const migration = fs.readFileSync(migrationPath, 'utf8');

try {
    db.exec(migration);
    console.log('✓ マイグレーション013を適用しました: project_goals テーブル作成');
} catch (error) {
    console.error('マイグレーション適用エラー:', error.message);
    process.exit(1);
} finally {
    db.close();
}
