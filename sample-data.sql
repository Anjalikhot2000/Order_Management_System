-- Sample data for Order Management System

USE order_management;

-- Insert sample categories
INSERT INTO categories (name, description) VALUES
('Electronics', 'Electronic devices and gadgets'),
('Clothing', 'Apparel and fashion items'),
('Books', 'Books and publications'),
('Home & Garden', 'Home improvement and garden supplies'),
('Sports & Fitness', 'Sports equipment and fitness gear'),
('Beauty & Personal Care', 'Beauty products and personal care items'),
('Toys & Games', 'Toys, games and entertainment'),
('Automotive', 'Car accessories and automotive products'),
('Pet Supplies', 'Pet food, toys, and accessories');

-- Insert sample products
INSERT INTO products (name, description, price, category_id, stock_quantity, image_url) VALUES
('iPhone 15', 'Latest iPhone with advanced features', 999.99, 1, 50, '/placeholder-product.jpg'),
('MacBook Pro', 'Powerful laptop for professionals', 1999.99, 1, 25, '/placeholder-product.jpg'),
('Wireless Headphones', 'High-quality wireless headphones', 199.99, 1, 100, '/placeholder-product.jpg'),
('Smart Watch', 'Fitness and health tracking smartwatch', 299.99, 1, 40, '/placeholder-product.jpg'),
('Bluetooth Speaker', 'Portable wireless speaker with excellent sound quality', 79.99, 1, 80, '/placeholder-product.jpg'),
('Gaming Mouse', 'High-precision gaming mouse with RGB lighting', 49.99, 1, 120, '/placeholder-product.jpg'),
('USB-C Hub', 'Multi-port USB-C hub for laptops', 39.99, 1, 90, '/placeholder-product.jpg'),
('Wireless Charger', 'Fast wireless charging pad', 29.99, 1, 150, '/placeholder-product.jpg'),

-- Clothing Products
('T-Shirt', 'Comfortable cotton t-shirt', 29.99, 2, 200, '/placeholder-product.jpg'),
('Jeans', 'Classic denim jeans', 79.99, 2, 150, '/placeholder-product.jpg'),
('Hoodie', 'Warm and cozy hoodie', 59.99, 2, 100, '/placeholder-product.jpg'),
('Sneakers', 'Comfortable running sneakers', 89.99, 2, 75, '/placeholder-product.jpg'),
('Dress Shirt', 'Formal dress shirt for office wear', 49.99, 2, 80, '/placeholder-product.jpg'),
('Winter Jacket', 'Warm winter jacket', 129.99, 2, 50, '/placeholder-product.jpg'),
('Baseball Cap', 'Classic baseball cap', 19.99, 2, 200, '/placeholder-product.jpg'),
('Socks Pack', 'Pack of 5 comfortable cotton socks', 14.99, 2, 300, '/placeholder-product.jpg'),

-- Books
('Programming Book', 'Learn programming with this comprehensive guide', 49.99, 3, 75, '/placeholder-product.jpg'),
('JavaScript Guide', 'Complete JavaScript programming guide', 39.99, 3, 60, '/placeholder-product.jpg'),
('React Handbook', 'Master React development', 44.99, 3, 55, '/placeholder-product.jpg'),
('Python Crash Course', 'Learn Python programming quickly', 34.99, 3, 70, '/placeholder-product.jpg'),
('Data Science Book', 'Introduction to data science and analytics', 54.99, 3, 45, '/placeholder-product.jpg'),
('Web Design Principles', 'Learn modern web design', 42.99, 3, 65, '/placeholder-product.jpg'),
('Business Strategy', 'Strategic business planning guide', 29.99, 3, 80, '/placeholder-product.jpg'),
('Cooking Recipes', 'Delicious home cooking recipes', 24.99, 3, 90, '/placeholder-product.jpg'),

-- Home & Garden
('Garden Tools Set', 'Complete set of gardening tools', 89.99, 4, 30, '/placeholder-product.jpg'),
('Coffee Maker', 'Automatic drip coffee maker', 69.99, 4, 40, '/placeholder-product.jpg'),
('Blender', 'High-speed kitchen blender', 79.99, 4, 35, '/placeholder-product.jpg'),
('Vacuum Cleaner', 'Powerful upright vacuum cleaner', 149.99, 4, 25, '/placeholder-product.jpg'),
('Bedding Set', 'Complete queen size bedding set', 99.99, 4, 45, '/placeholder-product.jpg'),
('Throw Pillows', 'Set of 4 decorative throw pillows', 39.99, 4, 60, '/placeholder-product.jpg'),
('Wall Clock', 'Modern wall clock', 24.99, 4, 70, '/placeholder-product.jpg'),
('Plant Pot Set', 'Set of 3 decorative plant pots', 34.99, 4, 55, '/placeholder-product.jpg'),

-- Sports & Fitness
('Yoga Mat', 'Non-slip yoga mat for exercise', 29.99, 5, 100, '/placeholder-product.jpg'),
('Dumbbells Set', 'Adjustable dumbbells for home workouts', 89.99, 5, 40, '/placeholder-product.jpg'),
('Running Shoes', 'Comfortable running shoes', 119.99, 5, 60, '/placeholder-product.jpg'),
('Fitness Tracker', 'Advanced fitness tracking band', 79.99, 5, 85, '/placeholder-product.jpg'),
('Basketball', 'Official size basketball', 39.99, 5, 70, '/placeholder-product.jpg'),
('Tennis Racket', 'Professional tennis racket', 149.99, 5, 30, '/placeholder-product.jpg'),
('Swimming Goggles', 'Anti-fog swimming goggles', 19.99, 5, 120, '/placeholder-product.jpg'),
('Resistance Bands', 'Set of resistance bands for strength training', 24.99, 5, 90, '/placeholder-product.jpg'),

-- Beauty & Personal Care
('Face Moisturizer', 'Hydrating face moisturizer', 34.99, 6, 80, '/placeholder-product.jpg'),
('Shampoo', 'Natural herbal shampoo', 14.99, 6, 150, '/placeholder-product.jpg'),
('Lipstick', 'Long-lasting matte lipstick', 19.99, 6, 100, '/placeholder-product.jpg'),
('Facial Cleanser', 'Gentle facial cleanser', 22.99, 6, 90, '/placeholder-product.jpg'),
('Hair Dryer', 'Professional hair dryer', 69.99, 6, 45, '/placeholder-product.jpg'),
('Perfume', 'Elegant fragrance for women', 49.99, 6, 60, '/placeholder-product.jpg'),
('Nail Polish Set', 'Set of 6 nail polish colors', 24.99, 6, 110, '/placeholder-product.jpg'),
('Sunscreen', 'SPF 50 broad spectrum sunscreen', 16.99, 6, 130, '/placeholder-product.jpg'),

-- Toys & Games
('Building Blocks', 'Creative building blocks set', 39.99, 7, 75, '/placeholder-product.jpg'),
('Board Game', 'Family strategy board game', 29.99, 7, 85, '/placeholder-product.jpg'),
('Puzzle Set', '500-piece jigsaw puzzle', 19.99, 7, 95, '/placeholder-product.jpg'),
('Stuffed Animal', 'Soft plush teddy bear', 24.99, 7, 120, '/placeholder-product.jpg'),
('Remote Control Car', 'RC car with rechargeable battery', 49.99, 7, 50, '/placeholder-product.jpg'),
('Art Supplies Kit', 'Complete art supplies set for kids', 34.99, 7, 65, '/placeholder-product.jpg'),
('Science Experiment Kit', 'Educational science experiment kit', 44.99, 7, 40, '/placeholder-product.jpg'),
('Card Game', 'Classic card game for all ages', 14.99, 7, 140, '/placeholder-product.jpg'),

-- Automotive
('Car Air Freshener', 'Long-lasting car air freshener', 9.99, 8, 200, '/placeholder-product.jpg'),
('Phone Mount', 'Universal smartphone car mount', 19.99, 8, 100, '/placeholder-product.jpg'),
('Car Vacuum', 'Portable car vacuum cleaner', 39.99, 8, 55, '/placeholder-product.jpg'),
('Tire Pressure Gauge', 'Digital tire pressure gauge', 14.99, 8, 80, '/placeholder-product.jpg'),
('Car Wax', 'Premium car wax and sealant', 24.99, 8, 70, '/placeholder-product.jpg'),
('Seat Covers', 'Universal car seat covers', 49.99, 8, 35, '/placeholder-product.jpg'),
('LED Light Bulbs', 'LED replacement bulbs for cars', 29.99, 8, 60, '/placeholder-product.jpg'),
('Car Organizer', 'Multi-compartment car organizer', 16.99, 8, 90, '/placeholder-product.jpg'),

-- Additional Electronics
('Tablet', '10-inch Android tablet with stylus', 349.99, 1, 35, '/placeholder-product.jpg'),
('External Hard Drive', '2TB portable external hard drive', 89.99, 1, 65, '/placeholder-product.jpg'),
('Webcam', '1080p HD webcam for video calls', 59.99, 1, 85, '/placeholder-product.jpg'),

-- Additional Clothing
('Sweater', 'Cozy wool blend sweater', 69.99, 2, 60, '/placeholder-product.jpg'),
('Sandals', 'Comfortable leather sandals', 39.99, 2, 90, '/placeholder-product.jpg'),
('Backpack', 'Durable hiking backpack', 79.99, 2, 45, '/placeholder-product.jpg'),

-- Additional Books
('Photography Guide', 'Master digital photography', 39.99, 3, 50, '/placeholder-product.jpg'),
('Self-Help Book', 'Personal development and motivation', 26.99, 3, 75, '/placeholder-product.jpg'),

-- Additional Home & Garden
('Microwave Oven', '1000W countertop microwave', 119.99, 4, 30, '/placeholder-product.jpg'),
('Lawn Mower', 'Electric lawn mower for small yards', 249.99, 4, 20, '/placeholder-product.jpg'),
('Dining Table Set', '4-piece dining table and chairs', 499.99, 4, 15, '/placeholder-product.jpg'),

-- Additional Sports & Fitness
('Protein Powder', 'Whey protein powder supplement', 49.99, 5, 80, '/placeholder-product.jpg'),
('Cycling Helmet', 'Safety cycling helmet with ventilation', 59.99, 5, 55, '/placeholder-product.jpg'),

-- Additional Beauty & Personal Care
('Body Lotion', 'Moisturizing body lotion', 18.99, 6, 110, '/placeholder-product.jpg'),
('Makeup Brush Set', 'Professional makeup brush collection', 34.99, 6, 70, '/placeholder-product.jpg'),

-- Additional Toys & Games
('Drone', 'Beginner-friendly camera drone', 199.99, 7, 25, '/placeholder-product.jpg'),
('LEGO Set', 'Creative building LEGO set', 79.99, 7, 45, '/placeholder-product.jpg'),

-- Additional Automotive
('Car Battery', 'Heavy-duty car battery', 129.99, 8, 30, '/placeholder-product.jpg'),
('GPS Navigator', 'Portable GPS navigation device', 149.99, 8, 40, '/placeholder-product.jpg'),

-- Pet Supplies
('Dog Food', 'Premium dry dog food for all breeds', 49.99, 9, 100, '/placeholder-product.jpg'),
('Cat Litter', 'Clumping cat litter with odor control', 19.99, 9, 150, '/placeholder-product.jpg'),
('Pet Bed', 'Comfortable orthopedic pet bed', 79.99, 9, 40, '/placeholder-product.jpg'),
('Dog Leash', 'Durable nylon dog leash', 14.99, 9, 120, '/placeholder-product.jpg'),
('Cat Toy Set', 'Interactive cat toys collection', 24.99, 9, 80, '/placeholder-product.jpg'),
('Bird Cage', 'Large bird cage with accessories', 89.99, 9, 25, '/placeholder-product.jpg'),
('Aquarium Kit', 'Complete freshwater aquarium starter kit', 149.99, 9, 20, '/placeholder-product.jpg'),
('Pet Shampoo', 'Gentle pet shampoo for dogs and cats', 16.99, 9, 90, '/placeholder-product.jpg');

-- Insert sample admin user
INSERT INTO users (name, email, password, role) VALUES
('Admin User', 'admin@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('John Customer', 'john@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'customer');

-- Insert customer profiles
INSERT INTO customers (user_id, phone, address, city, state, zip_code, country) VALUES
(3, '+1234567890', '123 Main St', 'New York', 'NY', '10001', 'USA');