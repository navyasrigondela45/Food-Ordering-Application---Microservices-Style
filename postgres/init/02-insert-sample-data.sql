-- Sample Users
INSERT INTO users (id, name, email, password, address, phone) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'John Doe', 'john@example.com', 
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 
 '123 Main St, New York, NY 10001', '+1234567890'),

('550e8400-e29b-41d4-a716-446655440001', 'Jane Smith', 'jane@example.com',
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
 '456 Oak Ave, Los Angeles, CA 90001', '+1987654321'),

('550e8400-e29b-41d4-a716-446655440002', 'Bob Wilson', 'bob@example.com',
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
 '789 Pine St, Chicago, IL 60601', '+1122334455');

-- Sample Products
INSERT INTO products (id, name, description, price, category, image_url, stock_quantity) VALUES
('660e8400-e29b-41d4-a716-446655440000', 'Margherita Pizza', 
 'Classic pizza with tomato sauce, fresh mozzarella, and basil', 12.99, 'Pizza', 
 'https://example.com/margherita.jpg', 50),

('660e8400-e29b-41d4-a716-446655440001', 'Pepperoni Pizza',
 'Pizza topped with pepperoni, mozzarella, and tomato sauce', 14.99, 'Pizza',
 'https://example.com/pepperoni.jpg', 40),

('660e8400-e29b-41d4-a716-446655440002', 'Chicken Burger',
 'Grilled chicken breast with lettuce, tomato, and mayo', 9.99, 'Burgers',
 'https://example.com/chicken-burger.jpg', 30),

('660e8400-e29b-41d4-a716-446655440003', 'Veggie Burger',
 'Plant-based patty with fresh vegetables and vegan sauce', 10.99, 'Burgers',
 'https://example.com/veggie-burger.jpg', 25),

('660e8400-e29b-41d4-a716-446655440004', 'French Fries',
 'Crispy golden fries with sea salt', 4.99, 'Sides',
 'https://example.com/fries.jpg', 100),

('660e8400-e29b-41d4-a716-446655440005', 'Chocolate Milkshake',
 'Creamy chocolate milkshake with whipped cream', 5.99, 'Beverages',
 'https://example.com/milkshake.jpg', 45),

('660e8400-e29b-41d4-a716-446655440006', 'Caesar Salad',
 'Fresh romaine lettuce with parmesan, croutons, and caesar dressing', 8.99, 'Salads',
 'https://example.com/caesar-salad.jpg', 35);

-- Sample Orders
INSERT INTO orders (id, user_id, total_amount, delivery_address, payment_method, status, created_at) VALUES
('770e8400-e29b-41d4-a716-446655440000', 
 '550e8400-e29b-41d4-a716-446655440000', 
 27.98, 
 '123 Main St, New York, NY 10001', 
 'Credit Card', 
 'delivered', 
 CURRENT_TIMESTAMP - INTERVAL '2 days'),

('770e8400-e29b-41d4-a716-446655440001',
 '550e8400-e29b-41d4-a716-446655440001',
 25.98,
 '456 Oak Ave, Los Angeles, CA 90001',
 'Cash on Delivery',
 'confirmed',
 CURRENT_TIMESTAMP - INTERVAL '1 day'),

('770e8400-e29b-41d4-a716-446655440002',
 '550e8400-e29b-41d4-a716-446655440000',
 15.98,
 '123 Main St, New York, NY 10001',
 'Credit Card',
 'pending',
 CURRENT_TIMESTAMP);

-- Sample Order Items
INSERT INTO order_items (order_id, product_id, product_name, quantity, price, subtotal) VALUES
('770e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440000', 
 'Margherita Pizza', 2, 12.99, 25.98),

('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001',
 'Pepperoni Pizza', 1, 14.99, 14.99),
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440004',
 'French Fries', 1, 4.99, 4.99),

('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002',
 'Chicken Burger', 1, 9.99, 9.99),
('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440005',
 'Chocolate Milkshake', 1, 5.99, 5.99);
