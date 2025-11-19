const Database = require('better-sqlite3');
const db = new Database('local.db');

try {
  // Check if email column already exists
  const tableInfo = db.prepare('PRAGMA table_info(users)').all();
  const emailExists = tableInfo.some(col => col.name === 'email');

  if (emailExists) {
    console.log('Email column already exists');
  } else {
    // Add email column without UNIQUE constraint first
    console.log('Adding email column to users table...');
    db.exec(`ALTER TABLE users ADD COLUMN email TEXT;`);
    console.log('✓ Email column added');
  }

  // Create unique index on email
  console.log('Creating unique index on email...');
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
  console.log('✓ Unique index created');

  // Check the updated schema
  const updatedTableInfo = db.prepare('PRAGMA table_info(users)').all();
  console.log('\nUpdated users table schema:');
  console.log(updatedTableInfo);

  // Check indexes
  const indexes = db.prepare('PRAGMA index_list(users)').all();
  console.log('\nIndexes on users table:');
  console.log(indexes);

} catch (error) {
  console.error('Error:', error.message);
} finally {
  db.close();
}
