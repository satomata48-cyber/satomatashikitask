-- Twitter API Settings for OAuth 1.0a
CREATE TABLE IF NOT EXISTS twitter_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    api_key TEXT NOT NULL,
    api_secret TEXT NOT NULL,
    access_token TEXT NOT NULL,
    access_token_secret TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id)
);

CREATE INDEX IF NOT EXISTS idx_twitter_settings_project ON twitter_settings(project_id);
