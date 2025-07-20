CREATE DATABASE IF NOT EXISTS cashmate;
USE cashmate;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, date),
    INDEX idx_user_category (user_id, category),
    INDEX idx_user_type (user_id, type)
);

CREATE TABLE receipts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    file_path VARCHAR(500),
    file_size INT,
    mime_type VARCHAR(100),
    parsed_data JSON,
    processing_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_status (user_id, processing_status),
    INDEX idx_created_at (created_at)
);

CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    type ENUM('income', 'expense', 'both') NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(7), -- hex color code
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    type ENUM('income', 'expense', 'both') NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_category (user_id, name)
);

INSERT INTO categories (name, type, icon, color, is_default) VALUES
-- Expense categories
('Food & Dining', 'expense', '🍽️', '#FF6B6B', TRUE),
('Transportation', 'expense', '🚗', '#4ECDC4', TRUE),
('Shopping', 'expense', '🛒', '#45B7D1', TRUE),
('Entertainment', 'expense', '🎬', '#96CEB4', TRUE),
('Bills & Utilities', 'expense', '💡', '#FFEAA7', TRUE),
('Healthcare', 'expense', '⚕️', '#DDA0DD', TRUE),
('Education', 'expense', '📚', '#98D8C8', TRUE),
('Travel', 'expense', '✈️', '#F7DC6F', TRUE),
('Personal Care', 'expense', '💄', '#BB8FCE', TRUE),
('Home & Garden', 'expense', '🏠', '#85C1E9', TRUE),
('Miscellaneous', 'expense', '📦', '#F8C471', TRUE),

-- Income categories
('Salary', 'income', '💰', '#58D68D', TRUE),
('Freelance', 'income', '💻', '#5DADE2', TRUE),
('Investment', 'income', '📈', '#F4D03F', TRUE),
('Business', 'income', '🏢', '#AF7AC5', TRUE),
('Gift', 'income', '🎁', '#F1948A', TRUE),
('Other Income', 'income', '💵', '#82E0AA', TRUE);

-- Create a view for transaction summaries
CREATE VIEW transaction_summary AS
SELECT 
    t.user_id,
    t.type,
    t.category,
    COUNT(*) as transaction_count,
    SUM(t.amount) as total_amount,
    AVG(t.amount) as avg_amount,
    MIN(t.date) as earliest_date,
    MAX(t.date) as latest_date
FROM transactions t
GROUP BY t.user_id, t.type, t.category;

-- Create a view for monthly summaries
CREATE VIEW monthly_summary AS
SELECT 
    t.user_id,
    YEAR(t.date) as year,
    MONTH(t.date) as month,
    t.type,
    COUNT(*) as transaction_count,
    SUM(t.amount) as total_amount
FROM transactions t
GROUP BY t.user_id, YEAR(t.date), MONTH(t.date), t.type;

-- Add some useful indexes for better performance
CREATE INDEX idx_transactions_date_range ON transactions(user_id, date, type);
CREATE INDEX idx_receipts_user_date ON receipts(user_id, created_at);

-- Optional: Create a stored procedure for user financial summary
DELIMITER //
CREATE PROCEDURE GetUserFinancialSummary(IN userId INT, IN startDate DATE, IN endDate DATE)
BEGIN
    SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net_balance,
        COUNT(*) as total_transactions
    FROM transactions 
    WHERE user_id = userId 
    AND date BETWEEN startDate AND endDate;
END //
DELIMITER ;

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token (token(255)),
    INDEX idx_expires_at (expires_at),
    
    UNIQUE KEY unique_user_token (user_id, token(255))
);