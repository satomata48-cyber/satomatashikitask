-- Add discord_notify column to cards table
ALTER TABLE cards ADD COLUMN discord_notify INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_cards_discord_notify ON cards(discord_notify);
