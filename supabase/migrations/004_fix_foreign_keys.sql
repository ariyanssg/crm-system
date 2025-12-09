-- CRITICAL: Run this SQL in Supabase SQL Editor
-- This ensures PostgREST can detect foreign key relationships for joins

-- First, let's verify the foreign keys exist
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public';

-- If subscriptions table exists but doesn't have proper foreign keys, add them:
DO $$
BEGIN
    -- Check and add customer_id FK to subscriptions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'subscriptions_customer_id_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE subscriptions 
        ADD CONSTRAINT subscriptions_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added subscriptions_customer_id_fkey';
    END IF;
    
    -- Check and add product_id FK to subscriptions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'subscriptions_product_id_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'product_id'
    ) THEN
        ALTER TABLE subscriptions 
        ADD CONSTRAINT subscriptions_product_id_fkey 
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;
        RAISE NOTICE 'Added subscriptions_product_id_fkey';
    END IF;
    
    -- Check and add master_account_id FK to subscriptions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'subscriptions_master_account_id_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'master_account_id'
    ) THEN
        ALTER TABLE subscriptions 
        ADD CONSTRAINT subscriptions_master_account_id_fkey 
        FOREIGN KEY (master_account_id) REFERENCES master_accounts(id);
        RAISE NOTICE 'Added subscriptions_master_account_id_fkey';
    END IF;
    
    -- Check and add product_id FK to master_accounts
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'master_accounts_product_id_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'master_accounts' AND column_name = 'product_id'
    ) THEN
        ALTER TABLE master_accounts 
        ADD CONSTRAINT master_accounts_product_id_fkey 
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;
        RAISE NOTICE 'Added master_accounts_product_id_fkey';
    END IF;
    
    -- Check and add subscription_id FK to issues
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'issues_subscription_id_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'issues' AND column_name = 'subscription_id'
    ) THEN
        ALTER TABLE issues 
        ADD CONSTRAINT issues_subscription_id_fkey 
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added issues_subscription_id_fkey';
    END IF;
    
    -- Check and add customer_id FK to issues
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'issues_customer_id_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'issues' AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE issues 
        ADD CONSTRAINT issues_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added issues_customer_id_fkey';
    END IF;
END $$;

-- Force PostgREST to reload schema cache
-- This is done by notifying the pgrst channel
NOTIFY pgrst, 'reload schema';

-- Verify foreign keys now
SELECT 'FOREIGN KEYS AFTER FIX:' as result;
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
