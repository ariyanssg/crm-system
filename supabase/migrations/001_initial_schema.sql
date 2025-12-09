-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUM Types
CREATE TYPE user_role AS ENUM ('admin', 'customer');
CREATE TYPE product_type AS ENUM ('shared', 'individual');
CREATE TYPE product_status AS ENUM ('active', 'disabled', 'out_of_stock');
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'suspended', 'pending');
CREATE TYPE issue_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE issue_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Users Table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    role user_role DEFAULT 'customer',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    product_type product_type NOT NULL,
    max_slots INTEGER,
    price DECIMAL(10,2) NOT NULL,
    billing_cycle_days INTEGER DEFAULT 30,
    status product_status DEFAULT 'active',
    icon_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Master Accounts (Family/Shared accounts)
CREATE TABLE master_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    account_email TEXT NOT NULL,
    account_password TEXT NOT NULL,
    recovery_email TEXT,
    recovery_phone TEXT,
    security_questions JSONB,
    authenticator_secret TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    master_account_id UUID REFERENCES master_accounts(id),
    status subscription_status DEFAULT 'pending',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    renewal_date DATE,
    auto_renew BOOLEAN DEFAULT false,
    individual_email TEXT,
    individual_password TEXT,
    individual_recovery_info JSONB,
    invited_email TEXT,
    slot_number INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support Issues
CREATE TABLE issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status issue_status DEFAULT 'open',
    priority issue_priority DEFAULT 'medium',
    admin_notes TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Issue Comments
CREATE TABLE issue_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_renewal ON subscriptions(renewal_date);
CREATE INDEX idx_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX idx_issues_customer ON issues(customer_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at);
CREATE INDEX idx_master_accounts_product ON master_accounts(product_id);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins manage all profiles" ON profiles
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- RLS Policies for products
CREATE POLICY "Anyone view active products" ON products
    FOR SELECT USING (status = 'active' OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins manage products" ON products
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- RLS Policies for master_accounts (Admin only)
CREATE POLICY "Admins manage master accounts" ON master_accounts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- RLS Policies for subscriptions
CREATE POLICY "Customers view own subscriptions" ON subscriptions
    FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Admins manage all subscriptions" ON subscriptions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- RLS Policies for issues
CREATE POLICY "Customers view own issues" ON issues
    FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Customers create own issues" ON issues
    FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Admins manage all issues" ON issues
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- RLS Policies for issue_comments
CREATE POLICY "Users view non-internal comments on their issues" ON issue_comments
    FOR SELECT USING (
        NOT is_internal AND EXISTS (
            SELECT 1 FROM issues WHERE issues.id = issue_comments.issue_id AND issues.customer_id = auth.uid()
        )
    );

CREATE POLICY "Admins view all comments" ON issue_comments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users create comments on own issues" ON issue_comments
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND 
        NOT is_internal AND
        EXISTS (SELECT 1 FROM issues WHERE issues.id = issue_comments.issue_id AND issues.customer_id = auth.uid())
    );

CREATE POLICY "Admins manage all comments" ON issue_comments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- RLS Policies for notifications
CREATE POLICY "Users view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins manage all notifications" ON notifications
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- RLS Policies for audit_logs (Admin read-only)
CREATE POLICY "Admins view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_master_accounts_updated_at BEFORE UPDATE ON master_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON issues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
