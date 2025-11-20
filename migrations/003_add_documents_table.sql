-- Documents table (Notion-like documents for cards and boards)
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER,
    board_id INTEGER,
    title TEXT NOT NULL,
    content TEXT,
    parent_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_documents_card_id ON documents(card_id);
CREATE INDEX IF NOT EXISTS idx_documents_board_id ON documents(board_id);
CREATE INDEX IF NOT EXISTS idx_documents_parent_id ON documents(parent_id);
