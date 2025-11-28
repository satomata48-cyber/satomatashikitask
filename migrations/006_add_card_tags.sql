-- Add tags column to cards table (JSON format: [{name: string, color: string}])
ALTER TABLE cards ADD COLUMN tags TEXT DEFAULT '[]';
