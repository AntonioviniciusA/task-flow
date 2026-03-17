-- Migration to add all_day column to tasks table
ALTER TABLE tasks ADD COLUMN all_day INTEGER DEFAULT 0;
