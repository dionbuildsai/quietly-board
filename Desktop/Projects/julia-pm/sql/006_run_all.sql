-- Run all migration scripts in order
-- Execute this file against your Quietly DB PostgreSQL instance

-- 1. Create vendors table
\i 001_create_vendors.sql

-- 2. Create messages table
\i 002_create_messages.sql

-- 3. Create pending_media table
\i 003_create_pending_media.sql

-- 4. Add telegram_id to tenants
\i 004_alter_tenants.sql

-- 5. Add ticket columns to maintenance_requests
\i 005_alter_maintenance_requests.sql

-- Verify all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
