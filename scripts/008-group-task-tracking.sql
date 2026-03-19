-- Migration to add completed_by_user_id to tasks for group collaboration tracking
ALTER TABLE tasks ADD COLUMN completed_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

-- Index for group task performance analysis
CREATE INDEX IF NOT EXISTS idx_tasks_completed_by ON tasks(completed_by_user_id);
