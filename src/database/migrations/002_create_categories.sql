-- src/database/migrations/002_create_categories.sql
-- =============================================
-- MIGRATION 002: Create Categories Table
-- Description: Product categories with hierarchy
-- =============================================

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    
    -- For nested categories (Electronics → Phones → iPhones)
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    
    is_active BOOLEAN DEFAULT true,
    product_count INTEGER DEFAULT 0, -- Denormalized for performance
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT categories_name_check CHECK (char_length(name) >= 2)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories (slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories (is_active) WHERE is_active = true;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO categories (name, slug, description, product_count) VALUES
    ('Electronics', 'electronics', 'Electronic devices and gadgets', 0),
    ('Clothing', 'clothing', 'Fashion and apparel', 0),
    ('Home & Garden', 'home-garden', 'Home improvement and garden supplies', 0),
    ('Sports', 'sports', 'Sports equipment and gear', 0),
    ('Books', 'books', 'Books and publications', 0)
ON CONFLICT (slug) DO NOTHING;