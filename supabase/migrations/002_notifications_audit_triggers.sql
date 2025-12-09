-- Migration 002: Add notification triggers, audit logging, and auto-renewal support
-- Run this after 001_initial_schema.sql

-- ============================================
-- NOTIFICATION SYSTEM TRIGGERS
-- ============================================

-- Function to create notification for subscription created
CREATE OR REPLACE FUNCTION notify_subscription_created()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
        NEW.customer_id,
        'New Subscription Created',
        'Your subscription has been activated. Welcome!',
        'subscription',
        '/portal/my-products'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for subscription creation
DROP TRIGGER IF EXISTS on_subscription_created ON subscriptions;
CREATE TRIGGER on_subscription_created
    AFTER INSERT ON subscriptions
    FOR EACH ROW
    WHEN (NEW.status = 'active')
    EXECUTE FUNCTION notify_subscription_created();

-- Function to notify on subscription status change
CREATE OR REPLACE FUNCTION notify_subscription_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status != OLD.status THEN
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (
            NEW.customer_id,
            CASE 
                WHEN NEW.status = 'expired' THEN 'Subscription Expired'
                WHEN NEW.status = 'suspended' THEN 'Subscription Suspended'
                WHEN NEW.status = 'active' AND OLD.status = 'expired' THEN 'Subscription Renewed'
                ELSE 'Subscription Updated'
            END,
            CASE 
                WHEN NEW.status = 'expired' THEN 'Your subscription has expired. Please renew to continue access.'
                WHEN NEW.status = 'suspended' THEN 'Your subscription has been suspended. Please contact support.'
                WHEN NEW.status = 'active' AND OLD.status = 'expired' THEN 'Your subscription has been renewed successfully!'
                ELSE 'Your subscription status has been updated.'
            END,
            'subscription',
            '/portal/my-products'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for subscription status change
DROP TRIGGER IF EXISTS on_subscription_status_change ON subscriptions;
CREATE TRIGGER on_subscription_status_change
    AFTER UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION notify_subscription_status_change();

-- Function to notify on issue status change
CREATE OR REPLACE FUNCTION notify_issue_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status != OLD.status THEN
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (
            NEW.customer_id,
            CASE 
                WHEN NEW.status = 'in_progress' THEN 'Issue Being Reviewed'
                WHEN NEW.status = 'resolved' THEN 'Issue Resolved'
                WHEN NEW.status = 'closed' THEN 'Issue Closed'
                ELSE 'Issue Updated'
            END,
            'Your support ticket "' || LEFT(NEW.title, 50) || '" has been updated.',
            'issue',
            '/portal/issues/' || NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for issue status change
DROP TRIGGER IF EXISTS on_issue_status_change ON issues;
CREATE TRIGGER on_issue_status_change
    AFTER UPDATE ON issues
    FOR EACH ROW
    EXECUTE FUNCTION notify_issue_status_change();

-- Function to notify on new issue comment (non-internal)
CREATE OR REPLACE FUNCTION notify_issue_comment()
RETURNS TRIGGER AS $$
DECLARE
    issue_record RECORD;
    commenter_record RECORD;
BEGIN
    -- Skip internal comments
    IF NEW.is_internal THEN
        RETURN NEW;
    END IF;

    -- Get issue details
    SELECT * INTO issue_record FROM issues WHERE id = NEW.issue_id;
    
    -- Get commenter details
    SELECT * INTO commenter_record FROM profiles WHERE id = NEW.user_id;

    -- If admin commented, notify customer
    IF commenter_record.role = 'admin' THEN
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (
            issue_record.customer_id,
            'New Reply on Your Issue',
            'Support has replied to your ticket: "' || LEFT(issue_record.title, 40) || '"',
            'issue',
            '/portal/issues/' || issue_record.id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for issue comments
DROP TRIGGER IF EXISTS on_issue_comment_created ON issue_comments;
CREATE TRIGGER on_issue_comment_created
    AFTER INSERT ON issue_comments
    FOR EACH ROW
    EXECUTE FUNCTION notify_issue_comment();

-- ============================================
-- AUDIT LOGGING TRIGGERS
-- ============================================

-- Generic audit log function
CREATE OR REPLACE FUNCTION audit_log_changes()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    user_id_val UUID;
BEGIN
    -- Try to get current user, may be null for system operations
    BEGIN
        user_id_val := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        user_id_val := NULL;
    END;

    IF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
        VALUES (user_id_val, TG_OP, TG_TABLE_NAME, OLD.id, old_data, NULL);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        -- Only log if there are actual changes
        IF old_data != new_data THEN
            INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
            VALUES (user_id_val, TG_OP, TG_TABLE_NAME, NEW.id, old_data, new_data);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        new_data := to_jsonb(NEW);
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
        VALUES (user_id_val, TG_OP, TG_TABLE_NAME, NEW.id, NULL, new_data);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to important tables
DROP TRIGGER IF EXISTS audit_products ON products;
CREATE TRIGGER audit_products
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_subscriptions ON subscriptions;
CREATE TRIGGER audit_subscriptions
    AFTER INSERT OR UPDATE OR DELETE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_master_accounts ON master_accounts;
CREATE TRIGGER audit_master_accounts
    AFTER INSERT OR UPDATE OR DELETE ON master_accounts
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_issues ON issues;
CREATE TRIGGER audit_issues
    AFTER INSERT OR UPDATE OR DELETE ON issues
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_profiles ON profiles;
CREATE TRIGGER audit_profiles
    AFTER UPDATE OR DELETE ON profiles
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

-- ============================================
-- SUBSCRIPTION EXPIRATION CHECK
-- ============================================

-- Function to check and update expired subscriptions
CREATE OR REPLACE FUNCTION check_expired_subscriptions()
RETURNS void AS $$
BEGIN
    UPDATE subscriptions
    SET status = 'expired'
    WHERE status = 'active'
      AND end_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-renew subscriptions
CREATE OR REPLACE FUNCTION process_auto_renewals()
RETURNS TABLE(renewed_count INTEGER, failed_count INTEGER) AS $$
DECLARE
    sub RECORD;
    renewed INTEGER := 0;
    failed INTEGER := 0;
    billing_days INTEGER;
BEGIN
    FOR sub IN 
        SELECT s.*, p.billing_cycle_days 
        FROM subscriptions s
        JOIN products p ON s.product_id = p.id
        WHERE s.auto_renew = true
          AND s.status = 'active'
          AND s.end_date <= CURRENT_DATE + INTERVAL '1 day'
    LOOP
        BEGIN
            UPDATE subscriptions
            SET 
                end_date = end_date + (sub.billing_cycle_days || ' days')::INTERVAL,
                renewal_date = CURRENT_DATE
            WHERE id = sub.id;
            
            -- Notify customer of renewal
            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES (
                sub.customer_id,
                'Subscription Auto-Renewed',
                'Your subscription has been automatically renewed for another ' || sub.billing_cycle_days || ' days.',
                'renewal',
                '/portal/my-products'
            );
            
            renewed := renewed + 1;
        EXCEPTION WHEN OTHERS THEN
            failed := failed + 1;
        END;
    END LOOP;
    
    RETURN QUERY SELECT renewed, failed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RLS POLICY FOR NOTIFICATIONS DELETE
-- ============================================

-- Allow users to delete their own notifications
CREATE POLICY "Users delete own notifications" ON notifications
    FOR DELETE USING (user_id = auth.uid());

-- Allow admins to insert notifications for any user
CREATE POLICY "Admins insert notifications" ON notifications
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Allow system to insert notifications (for triggers)
CREATE POLICY "System insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- ============================================
-- HELPER VIEW FOR EXPIRING SUBSCRIPTIONS
-- ============================================

CREATE OR REPLACE VIEW expiring_subscriptions AS
SELECT 
    s.*,
    p.name as product_name,
    p.billing_cycle_days,
    pr.full_name as customer_name,
    pr.email as customer_email,
    (s.end_date - CURRENT_DATE) as days_until_expiry
FROM subscriptions s
JOIN products p ON s.product_id = p.id
JOIN profiles pr ON s.customer_id = pr.id
WHERE s.status = 'active'
  AND s.end_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY s.end_date;

-- Grant access to the view
GRANT SELECT ON expiring_subscriptions TO authenticated;
