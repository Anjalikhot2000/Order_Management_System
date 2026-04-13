USE order_management;

-- Insert dummy products if not already there
INSERT IGNORE INTO categories (id, name, description) VALUES
(1, 'Electronics', 'Electronic devices and gadgets'),
(2, 'Clothing', 'Apparel and fashion items'),
(3, 'Books', 'Books and educational materials'),
(4, 'Home & Garden', 'Home and garden products'),
(5, 'Sports', 'Sports and fitness equipment');

-- Insert dummy products
INSERT IGNORE INTO products (id, name, description, price, category_id, stock_quantity) VALUES
(1, 'Wireless Bluetooth Headphones', 'High-quality wireless headphones with noise cancellation', 79.99, 1, 150),
(2, 'USB-C Fast Charging Cable', '3-meter USB-C cable with fast charging support', 12.99, 1, 500),
(3, 'Laptop Stand', 'Adjustable aluminum laptop stand for better ergonomics', 34.99, 1, 200),
(4, 'T-Shirt Bundle', 'Pack of 3 premium cotton t-shirts', 49.99, 2, 300),
(5, 'Running Shoes', 'Professional running shoes with cushioning', 129.99, 2, 180),
(6, 'Python Programming Guide', 'Comprehensive guide to Python programming', 39.99, 3, 100),
(7, 'Web Development Cookbook', 'Recipes and best practices for web development', 44.99, 3, 85),
(8, 'Smart LED Light Bulbs', 'Voice-controlled smart bulbs (set of 4)', 59.99, 4, 120),
(9, 'Yoga Mat', 'Non-slip yoga mat with carrying strap', 24.99, 5, 250),
(10, 'Dumbbell Set', '10kg dumbbell set with stand', 89.99, 5, 80);

-- Insert dummy customer if not exists (assumes user with id=2 exists)
INSERT IGNORE INTO customers (id, user_id, phone, address, city, state, zip_code, country) VALUES
(1, 2, '+1-555-0101', '123 Main Street', 'Springfield', 'IL', '62701', 'USA'),
(2, 3, '+1-555-0102', '456 Oak Avenue', 'Chicago', 'IL', '60601', 'USA'),
(3, 4, '+1-555-0103', '789 Pine Road', 'New York', 'NY', '10001', 'USA');

-- Insert dummy orders
INSERT IGNORE INTO orders (id, customer_id, total_amount, status, shipping_address, payment_status) VALUES
(1, 1, 179.97, 'confirmed', '123 Main Street, Springfield, IL 62701', 'paid'),
(2, 1, 299.97, 'processing', '123 Main Street, Springfield, IL 62701', 'paid'),
(3, 2, 89.99, 'shipped', '456 Oak Avenue, Chicago, IL 60601', 'paid'),
(4, 3, 209.98, 'delivered', '789 Pine Road, New York, NY 10001', 'paid'),
(5, 2, 134.98, 'pending', '456 Oak Avenue, Chicago, IL 60601', 'pending');

-- Insert order items for orders
INSERT IGNORE INTO order_items (id, order_id, product_id, quantity, price) VALUES
(1, 1, 1, 2, 79.99),
(2, 1, 2, 1, 12.99),
(3, 2, 3, 1, 34.99),
(4, 2, 4, 5, 49.99),
(5, 2, 5, 1, 129.99),
(6, 3, 9, 1, 24.99),
(7, 3, 10, 1, 89.99),
(8, 4, 6, 1, 39.99),
(9, 4, 7, 2, 44.99),
(10, 5, 8, 1, 59.99),
(11, 5, 2, 4, 12.99);

-- Insert dummy suppliers
INSERT IGNORE INTO suppliers (id, name, email, phone, address) VALUES
(1, 'Tech Supplies Inc', 'contact@techsupplies.com', '+1-555-1001', '100 Tech Drive, Silicon Valley, CA 94025'),
(2, 'Fashion World Ltd', 'sales@fashionworld.com', '+1-555-1002', '200 Style Street, New York, NY 10001'),
(3, 'Book Haven', 'info@bookhaven.com', '+1-555-1003', '300 Literature Lane, Boston, MA 02101');
