-- Migration to add notification settings to users table
ALTER TABLE users ADD COLUMN persistent_interval INTEGER DEFAULT 60;
ALTER TABLE users ADD COLUMN notification_sound INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN notification_vibration INTEGER DEFAULT 1;
