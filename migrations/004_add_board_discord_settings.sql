-- Add board_discord_settings table for Discord integration
CREATE TABLE IF NOT EXISTS board_discord_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id INTEGER NOT NULL,
  webhook_url TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  days_ahead INTEGER DEFAULT 3,
  cron_schedule TEXT NOT NULL DEFAULT '0 9 * * *',
  timezone TEXT DEFAULT 'Asia/Tokyo',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_board_discord_board_id ON board_discord_settings(board_id);
