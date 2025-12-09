-- Fix missing columns migration
-- Run this if tables exist but are missing required columns

-- First, check if enum types exist, if not create them
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_type') THEN
        CREATE TYPE product_type AS ENUM ('shared', 'individual');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_status') THEN
        CREATE TYPE product_status AS ENUM ('active', 'disabled', 'out_of_stock');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
        CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'suspended', 'pending');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'issue_status') THEN
        CREATE TYPE issue_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'issue_priority') THEN
        CREATE TYPE issue_priority AS ENUM ('low', 'medium', 'high', 'critical');
    END IF;
END $$;

-- Add missing columns to products table
DO $$
BEGIN
    -- Add product_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'product_type') THEN
        ALTER TABLE products ADD COLUMN product_type product_type NOT NULL DEFAULT 'individual';
    END IF;
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'status') THEN
        ALTER TABLE products ADD COLUMN status product_status NOT NULL DEFAULT 'active';
    END IF;
    
    -- Add max_slots column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'max_slots') THEN
        ALTER TABLE products ADD COLUMN max_slots INTEGER;
    END IF;
    
    -- Add billing_cycle_days column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'billing_cycle_days') THEN
        ALTER TABLE products ADD COLUMN billing_cycle_days INTEGER DEFAULT 30;
    END IF;
    
    -- Add icon_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'icon_url') THEN
        ALTER TABLE products ADD COLUMN icon_url TEXT;
    END IF;
END $$;

-- Add missing columns to subscriptions table
DO $$
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'subscriptions' AND column_name = 'status') THEN
        ALTER TABLE subscriptions ADD COLUMN status subscription_status NOT NULL DEFAULT 'pending';
    END IF;
    
    -- Add auto_renew column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'subscriptions' AND column_name = 'auto_renew') THEN
        ALTER TABLE subscriptions ADD COLUMN auto_renew BOOLEAN DEFAULT false;
    END IF;
    
    -- Add renewal_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'subscriptions' AND column_name = 'renewal_date') THEN
        ALTER TABLE subscriptions ADD COLUMN renewal_date DATE;
    END IF;
    
    -- Add individual_email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'subscriptions' AND column_name = 'individual_email') THEN
        ALTER TABLE subscriptions ADD COLUMN individual_email TEXT;
    END IF;
    
    -- Add individual_password column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'subscriptions' AND column_name = 'individual_password') THEN
        ALTER TABLE subscriptions ADD COLUMN individual_password TEXT;
    END IF;
    
    -- Add individual_recovery_info column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'subscriptions' AND column_name = 'individual_recovery_info') THEN
        ALTER TABLE subscriptions ADD COLUMN individual_recovery_info JSONB;
    END IF;
    
    -- Add invited_email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'subscriptions' AND column_name = 'invited_email') THEN
        ALTER TABLE subscriptions ADD COLUMN invited_email TEXT;
    END IF;
    
    -- Add slot_number column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'subscriptions' AND column_name = 'slot_number') THEN
        ALTER TABLE subscriptions ADD COLUMN slot_number INTEGER;
    END IF;
    
    -- Add notes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'subscriptions' AND column_name = 'notes') THEN
        ALTER TABLE subscriptions ADD COLUMN notes TEXT;
    END IF;
END $$;

-- Add missing columns to issues table
DO $$
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'status') THEN
        ALTER TABLE issues ADD COLUMN status issue_status NOT NULL DEFAULT 'open';
    END IF;
    
    -- Add priority column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'priority') THEN
        ALTER TABLE issues ADD COLUMN priority issue_priority NOT NULL DEFAULT 'medium';
    END IF;
    
    -- Add admin_notes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'admin_notes') THEN
        ALTER TABLE issues ADD COLUMN admin_notes TEXT;
    END IF;
    
    -- Add resolved_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'resolved_at') THEN
        ALTER TABLE issues ADD COLUMN resolved_at TIMESTAMPTZ;
    END IF;
    
    -- Add resolved_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'issues' AND column_name = 'resolved_by') THEN
        ALTER TABLE issues ADD COLUMN resolved_by UUID REFERENCES profiles(id);
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);

-- Verify the changes
SELECT 
    'products' as table_name,
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name IN ('product_type', 'status', 'max_slots', 'billing_cycle_days')
UNION ALL
SELECT 
    'subscriptions' as table_name,
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
  AND column_name IN ('status', 'auto_renew', 'renewal_date')
UNION ALL
SELECT 
    'issues' as table_name,
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'issues' 
  AND column_name IN ('status', 'priority');
