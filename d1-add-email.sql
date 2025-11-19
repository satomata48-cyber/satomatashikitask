-- Add email column to users table for D1
ALTER TABLE users ADD COLUMN email TEXT;

-- Create unique index on email
CREATE UNIQUE INDEX idx_users_email ON users(email);
