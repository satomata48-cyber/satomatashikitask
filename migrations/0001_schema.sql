-- Complete Database Schema

-- Users (no dependencies)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects (depends on users)
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    color TEXT DEFAULT '#3B82F6',
    position INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Boards (depends on users only, NOT linked to projects)
CREATE TABLE boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Lists (depends on boards)
CREATE TABLE lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Cards (depends on lists)
CREATE TABLE cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATETIME,
    position INTEGER DEFAULT 0,
    color TEXT,
    title_color TEXT,
    description_color TEXT,
    due_date_color TEXT,
    title_bg_color TEXT,
    description_bg_color TEXT,
    border_color TEXT,
    discord_notify INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
);

-- Labels (depends on boards)
CREATE TABLE labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#gray',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Card Labels (depends on cards, labels)
CREATE TABLE card_labels (
    card_id INTEGER NOT NULL,
    label_id INTEGER NOT NULL,
    PRIMARY KEY (card_id, label_id),
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
);

-- Card Tags (depends on cards)
CREATE TABLE card_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6B7280',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

-- Attachments (depends on cards)
CREATE TABLE attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    file_size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

-- Documents (depends on users and boards only, NOT linked to projects)
CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    board_id INTEGER,
    title TEXT NOT NULL,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Board Discord Settings (depends on boards)
CREATE TABLE board_discord_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL UNIQUE,
    webhook_url TEXT,
    enabled INTEGER DEFAULT 0,
    schedule_enabled INTEGER DEFAULT 0,
    schedule_time TEXT DEFAULT '09:00',
    schedule_days TEXT DEFAULT 'Mon,Tue,Wed,Thu,Fri',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Milestones (depends on projects)
CREATE TABLE milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    due_date DATE,
    status TEXT DEFAULT 'pending',
    position INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Milestone Tasks (depends on milestones)
CREATE TABLE milestone_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    milestone_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    position INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE
);

-- Project Tags (depends on users)
CREATE TABLE project_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6B7280',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Project Tag Mappings (depends on projects, project_tags)
CREATE TABLE project_tag_mappings (
    project_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (project_id, tag_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES project_tags(id) ON DELETE CASCADE
);

-- Project Objectives (depends on projects)
CREATE TABLE project_objectives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    is_routine INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    position INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Project SNS Items (depends on projects)
CREATE TABLE project_sns_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'planned',
    scheduled_date DATE,
    completed_date DATE,
    notes TEXT,
    position INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- KPI Goals (depends on projects)
CREATE TABLE project_kpi_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    target_value REAL DEFAULT 0,
    current_value REAL DEFAULT 0,
    unit TEXT DEFAULT '件',
    repeat_cycle TEXT DEFAULT 'weekly',
    period_start DATE,
    period_end DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- KPI Records (depends on project_kpi_goals)
CREATE TABLE project_kpi_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL,
    value REAL NOT NULL,
    recorded_date DATE NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (goal_id) REFERENCES project_kpi_goals(id) ON DELETE CASCADE
);

-- KPI Period History (depends on project_kpi_goals)
CREATE TABLE project_kpi_period_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    target_value REAL NOT NULL,
    achieved_value REAL NOT NULL,
    achievement_rate REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (goal_id) REFERENCES project_kpi_goals(id) ON DELETE CASCADE
);

-- ===== プロジェクト専用のボード・ドキュメント（グローバルボードとは完全に別） =====

-- Project Boards (プロジェクト専用ボード)
CREATE TABLE project_boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Project Lists (プロジェクトボード専用リスト)
CREATE TABLE project_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_board_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_board_id) REFERENCES project_boards(id) ON DELETE CASCADE
);

-- Project Cards (プロジェクトリスト専用カード)
CREATE TABLE project_cards (
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
CREATE TABLE project_documents (
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
CREATE INDEX idx_boards_user_id ON boards(user_id);
CREATE INDEX idx_lists_board_id ON lists(board_id);
CREATE INDEX idx_cards_list_id ON cards(list_id);
CREATE INDEX idx_cards_discord_notify ON cards(discord_notify);
CREATE INDEX idx_labels_board_id ON labels(board_id);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_board_id ON documents(board_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_milestones_project_id ON milestones(project_id);
CREATE INDEX idx_milestone_tasks_milestone_id ON milestone_tasks(milestone_id);
CREATE INDEX idx_project_tags_user_id ON project_tags(user_id);
CREATE INDEX idx_project_tag_mappings_project_id ON project_tag_mappings(project_id);
CREATE INDEX idx_project_objectives_project_id ON project_objectives(project_id);
CREATE INDEX idx_project_sns_items_project_id ON project_sns_items(project_id);
CREATE INDEX idx_kpi_goals_project_id ON project_kpi_goals(project_id);
CREATE INDEX idx_kpi_records_goal_id ON project_kpi_records(goal_id);
CREATE INDEX idx_kpi_records_date ON project_kpi_records(recorded_date);
CREATE INDEX idx_kpi_history_goal_id ON project_kpi_period_history(goal_id);
CREATE INDEX idx_kpi_history_period ON project_kpi_period_history(period_end);
CREATE INDEX idx_project_boards_project_id ON project_boards(project_id);
CREATE INDEX idx_project_lists_board_id ON project_lists(project_board_id);
CREATE INDEX idx_project_cards_list_id ON project_cards(project_list_id);
CREATE INDEX idx_project_documents_project_id ON project_documents(project_id);
CREATE INDEX idx_project_documents_board_id ON project_documents(project_board_id);

