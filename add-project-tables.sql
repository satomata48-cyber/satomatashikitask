-- プロジェクト専用のボード・ドキュメントテーブルを追加

-- Project Boards (プロジェクト専用ボード)
CREATE TABLE IF NOT EXISTS project_boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Project Lists (プロジェクトボード専用リスト)
CREATE TABLE IF NOT EXISTS project_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_board_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_board_id) REFERENCES project_boards(id) ON DELETE CASCADE
);

-- Project Cards (プロジェクトリスト専用カード)
CREATE TABLE IF NOT EXISTS project_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_list_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATETIME,
    position INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_list_id) REFERENCES project_lists(id) ON DELETE CASCADE
);

-- Project Documents (プロジェクト専用ドキュメント)
CREATE TABLE IF NOT EXISTS project_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    project_board_id INTEGER,
    title TEXT NOT NULL,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (project_board_id) REFERENCES project_boards(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_boards_project_id ON project_boards(project_id);
CREATE INDEX IF NOT EXISTS idx_project_lists_board_id ON project_lists(project_board_id);
CREATE INDEX IF NOT EXISTS idx_project_cards_list_id ON project_cards(project_list_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_board_id ON project_documents(project_board_id);
