-- Instagram / Facebook連携テーブル

-- Instagram/Facebook設定
CREATE TABLE IF NOT EXISTS instagram_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    project_id INTEGER,
    access_token TEXT,
    instagram_business_account_id TEXT,
    facebook_page_id TEXT,
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Instagramアカウント情報
CREATE TABLE IF NOT EXISTS instagram_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    account_id TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    name TEXT,
    profile_picture_url TEXT,
    bio TEXT,
    website TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Instagram統計データ
CREATE TABLE IF NOT EXISTS instagram_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    followers_count INTEGER DEFAULT 0,
    follows_count INTEGER DEFAULT 0,
    media_count INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    profile_views INTEGER DEFAULT 0,
    website_clicks INTEGER DEFAULT 0,
    recorded_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES instagram_accounts(id) ON DELETE CASCADE
);

-- Instagram投稿データ
CREATE TABLE IF NOT EXISTS instagram_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    post_id TEXT NOT NULL UNIQUE,
    caption TEXT,
    media_type TEXT,
    media_url TEXT,
    permalink TEXT,
    thumbnail_url TEXT,
    timestamp DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES instagram_accounts(id) ON DELETE CASCADE
);

-- Instagram投稿統計
CREATE TABLE IF NOT EXISTS instagram_post_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    saved_count INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    engagement INTEGER DEFAULT 0,
    recorded_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES instagram_posts(id) ON DELETE CASCADE
);

-- Facebookページ情報
CREATE TABLE IF NOT EXISTS facebook_pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    page_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT,
    profile_picture_url TEXT,
    cover_photo_url TEXT,
    about TEXT,
    website TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Facebook統計データ
CREATE TABLE IF NOT EXISTS facebook_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL,
    fan_count INTEGER DEFAULT 0,
    page_views INTEGER DEFAULT 0,
    page_impressions INTEGER DEFAULT 0,
    page_engaged_users INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    recorded_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES facebook_pages(id) ON DELETE CASCADE
);

-- Facebook投稿データ
CREATE TABLE IF NOT EXISTS facebook_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL,
    post_id TEXT NOT NULL UNIQUE,
    message TEXT,
    story TEXT,
    type TEXT,
    link TEXT,
    picture TEXT,
    created_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES facebook_pages(id) ON DELETE CASCADE
);

-- Facebook投稿統計
CREATE TABLE IF NOT EXISTS facebook_post_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    reactions_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    engagement INTEGER DEFAULT 0,
    recorded_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES facebook_posts(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_instagram_settings_project_id ON instagram_settings(project_id);
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_project_id ON instagram_accounts(project_id);
CREATE INDEX IF NOT EXISTS idx_instagram_stats_account_id ON instagram_stats(account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_stats_date ON instagram_stats(recorded_date);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_account_id ON instagram_posts(account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_post_stats_post_id ON instagram_post_stats(post_id);
CREATE INDEX IF NOT EXISTS idx_facebook_pages_project_id ON facebook_pages(project_id);
CREATE INDEX IF NOT EXISTS idx_facebook_stats_page_id ON facebook_stats(page_id);
CREATE INDEX IF NOT EXISTS idx_facebook_stats_date ON facebook_stats(recorded_date);
CREATE INDEX IF NOT EXISTS idx_facebook_posts_page_id ON facebook_posts(page_id);
CREATE INDEX IF NOT EXISTS idx_facebook_post_stats_post_id ON facebook_post_stats(post_id);
