-- DIAGNOSTIC: Check what exists in your database
-- Run this in Supabase SQL Editor to see what's missing

-- 1. Check if tables exist
SELECT 'TABLES CHECK' as section;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'products', 'subscriptions', 'issues', 'master_accounts', 'notifications', 'audit_logs', 'issue_comments');

-- 2. Check enum types
SELECT 'ENUM TYPES CHECK' as section;
SELECT typname FROM pg_type WHERE typname IN ('user_role', 'product_type', 'product_status', 'subscription_status', 'issue_status', 'issue_priority');

-- 3. Check products columns
SELECT 'PRODUCTS COLUMNS' as section;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' ORDER BY ordinal_position;

-- 4. Check subscriptions columns  
SELECT 'SUBSCRIPTIONS COLUMNS' as section;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'subscriptions' ORDER BY ordinal_position;

-- 5. Check issues columns
SELECT 'ISSUES COLUMNS' as section;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'issues' ORDER BY ordinal_position;

-- 6. Check profiles columns
SELECT 'PROFILES COLUMNS' as section;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles' ORDER BY ordinal_position;

-- 7. Check RLS policies
SELECT 'RLS POLICIES' as section;
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
