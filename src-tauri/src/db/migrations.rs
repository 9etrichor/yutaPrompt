use tauri_plugin_sql::{Migration, MigrationKind};

pub const DB_PATH: &str = "sqlite:yuta-prompt.db";

pub fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create_initial_tables",
        kind: MigrationKind::Up,
        sql: r#"
CREATE TABLE folders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id  INTEGER REFERENCES folders(id),
    name       TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    UNIQUE (parent_id, name)
);

CREATE TABLE prompts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id    INTEGER REFERENCES folders(id),
    title        TEXT NOT NULL,
    body         TEXT NOT NULL DEFAULT '',
    notes        TEXT NOT NULL DEFAULT '',
    favorite     INTEGER NOT NULL DEFAULT 0,
    use_count    INTEGER NOT NULL DEFAULT 0,
    last_used_at TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at   TEXT
);

CREATE INDEX idx_prompts_folder_id ON prompts(folder_id);

CREATE TABLE prompt_tags (
    prompt_id INTEGER NOT NULL REFERENCES prompts(id),
    tag       TEXT NOT NULL,
    PRIMARY KEY (prompt_id, tag)
);

CREATE TABLE analyses (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt_id  INTEGER NOT NULL REFERENCES prompts(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE interpretations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id INTEGER NOT NULL REFERENCES analyses(id),
    text        TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0
);
"#,
    }]
}
