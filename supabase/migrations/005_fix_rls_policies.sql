-- Fix RLS policies to allow admins to manage all data
-- Run this in Supabase SQL Editor

-- First, let's check current policies
SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public';

-- Drop existing restrictive policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Create new comprehensive policies for profiles
-- Allow anyone to read profiles (needed for customer lookups)
CREATE POLICY "Anyone can read profiles"
  ON profiles FOR SELECT
  USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to insert new profiles (for creating customers)
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR auth.uid() = id  -- Users can insert their own profile (for signup trigger)
  );

-- Allow admins to update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to delete profiles
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Fix products policies
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
DROP POLICY IF EXISTS "Admins can manage products" ON products;
DROP POLICY IF EXISTS "products_select_policy" ON products;
DROP POLICY IF EXISTS "products_insert_policy" ON products;
DROP POLICY IF EXISTS "products_update_policy" ON products;
DROP POLICY IF EXISTS "products_delete_policy" ON products;

CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert products"
  ON products FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update products"
  ON products FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Fix subscriptions policies
DROP POLICY IF EXISTS "Customers can view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_select_policy" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert_policy" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_update_policy" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_delete_policy" ON subscriptions;

CREATE POLICY "Users can view relevant subscriptions"
  ON subscriptions FOR SELECT
  USING (
    customer_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update subscriptions"
  ON subscriptions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete subscriptions"
  ON subscriptions FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Fix master_accounts policies
DROP POLICY IF EXISTS "Admins can manage master accounts" ON master_accounts;
DROP POLICY IF EXISTS "master_accounts_select_policy" ON master_accounts;
DROP POLICY IF EXISTS "master_accounts_insert_policy" ON master_accounts;
DROP POLICY IF EXISTS "master_accounts_update_policy" ON master_accounts;
DROP POLICY IF EXISTS "master_accounts_delete_policy" ON master_accounts;

CREATE POLICY "Admins can view master accounts"
  ON master_accounts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert master accounts"
  ON master_accounts FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update master accounts"
  ON master_accounts FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete master accounts"
  ON master_accounts FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Fix issues policies
DROP POLICY IF EXISTS "Users can view own issues" ON issues;
DROP POLICY IF EXISTS "Admins can manage all issues" ON issues;
DROP POLICY IF EXISTS "issues_select_policy" ON issues;
DROP POLICY IF EXISTS "issues_insert_policy" ON issues;
DROP POLICY IF EXISTS "issues_update_policy" ON issues;
DROP POLICY IF EXISTS "issues_delete_policy" ON issues;

CREATE POLICY "Users can view relevant issues"
  ON issues FOR SELECT
  USING (
    customer_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert issues"
  ON issues FOR INSERT
  WITH CHECK (
    customer_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can update own issues or admins all"
  ON issues FOR UPDATE
  USING (
    customer_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete issues"
  ON issues FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Fix notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON notifications;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (
    user_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System and admins can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);  -- Allow triggers and admins to create notifications

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (
    user_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (
    user_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Verify new policies
SELECT 'NEW POLICIES:' as status;
SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, cmd;
