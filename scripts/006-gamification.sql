-- Migration to add gamification columns to users table
ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1;

-- Tabela de Amizades
CREATE TABLE IF NOT EXISTS friendships (
  user_id1 TEXT NOT NULL,
  user_id2 TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id1, user_id2),
  FOREIGN KEY (user_id1) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id2) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabela de Histórico de Pontos (Log)
CREATE TABLE IF NOT EXISTS points_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  task_id TEXT,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);
