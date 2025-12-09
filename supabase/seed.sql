-- Seed data for testing

-- Insert sample products
INSERT INTO products (name, description, product_type, max_slots, price, billing_cycle_days, status) VALUES
('YouTube Premium Family', 'YouTube Premium shared family plan with ad-free experience', 'shared', 5, 3.99, 30, 'active'),
('Adobe Creative Cloud', 'Adobe CC shared access for creative professionals', 'shared', 10, 9.99, 30, 'active'),
('ChatGPT Plus', 'OpenAI ChatGPT Plus shared subscription', 'shared', 5, 4.99, 30, 'active'),
('Netflix Premium', 'Netflix Premium shared family account', 'shared', 4, 4.49, 30, 'active'),
('Spotify Family', 'Spotify Premium Family plan slot', 'shared', 6, 2.99, 30, 'active'),
('Microsoft 365 Family', 'Microsoft 365 Family subscription slot', 'shared', 6, 3.49, 30, 'active'),
('Canva Pro', 'Individual Canva Pro account with full access', 'individual', NULL, 12.99, 30, 'active'),
('Grammarly Premium', 'Individual Grammarly Premium account', 'individual', NULL, 11.99, 30, 'active');

-- Note: Master accounts and subscriptions should be created through the admin interface
-- with proper encryption for credentials
