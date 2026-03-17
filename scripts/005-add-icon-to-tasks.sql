-- Migration to add icon column to tasks table
ALTER TABLE tasks ADD COLUMN icon TEXT;
