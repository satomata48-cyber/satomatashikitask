const Database = require('better-sqlite3');
const db = new Database('local.db');

try {
  // Add email column to users table
  console.log('Adding email column to users table...');
  db.exec(`
    ALTER TABLE users ADD COLUMN email TEXT UNIQUE;
  `);

  console.log('✓ Email column added successfully');

  // Check the updated schema
  const tableInfo = db.prepare('PRAGMA table_info(users)').all();
  console.log('\nUpdated users table schema:');
  console.log(tableInfo);

} catch (error) {
  console.error('Error:', error.message);
} finally {
  db.close();
}
