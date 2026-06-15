-- src/database/migrations/003_create_products.sql
-- =============================================
-- MIGRATION 003: Create Products Table
-- Description: Product catalog with full indexing
-- =============================================

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    
    -- Pricing
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    compare_at_price DECIMAL(10,2), -- Original price (for sales)
    
    -- Inventory
    sku VARCHAR(100) UNIQUE,
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    low_stock_threshold INTEGER DEFAULT 10,
    is_in_stock BOOLEAN GENERATED ALWAYS AS (stock_quantity > 0) STORED,
    
    -- Relations
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    
    -- Media
    images TEXT[] DEFAULT '{}',
    
    -- Stats
    view_count INTEGER DEFAULT 0,
    sold_count INTEGER DEFAULT 0,
    rating_average DECIMAL(2,1) DEFAULT 0.0 CHECK (rating_average >= 0 AND rating_average <= 5),
    rating_count INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    -- Optimistic locking
    version INTEGER DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ -- Soft delete
);

-- =============================================
-- INDEXES (Critical for 1M+ products!)
-- =============================================

-- Primary search: active products by category, sorted by price
CREATE INDEX IF NOT EXISTS idx_products_category_price 
    ON products (category_id, is_active, price) 
    WHERE is_active = true AND deleted_at IS NULL;

-- Featured products on homepage
CREATE INDEX IF NOT EXISTS idx_products_featured 
    ON products (is_featured, created_at DESC) 
    WHERE is_featured = true AND is_active = true AND deleted_at IS NULL;

-- Price range filtering
CREATE INDEX IF NOT EXISTS idx_products_price 
    ON products (price) 
    WHERE is_active = true AND deleted_at IS NULL;

-- Stock management
CREATE INDEX IF NOT EXISTS idx_products_low_stock 
    ON products (stock_quantity) 
    WHERE stock_quantity <= low_stock_threshold AND is_active = true;

-- Best sellers
CREATE INDEX IF NOT EXISTS idx_products_sold 
    ON products (sold_count DESC) 
    WHERE is_active = true AND deleted_at IS NULL;

-- New arrivals
CREATE INDEX IF NOT EXISTS idx_products_created 
    ON products (created_at DESC) 
    WHERE is_active = true AND deleted_at IS NULL;

-- Slug lookup (for single product page)
CREATE INDEX IF NOT EXISTS idx_products_slug 
    ON products (slug) 
    WHERE deleted_at IS NULL;

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_products_search 
    ON products USING gin(
        to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(short_description, ''))
    );

-- Partial index for active products only
CREATE INDEX IF NOT EXISTS idx_products_active 
    ON products (id) 
    WHERE is_active = true AND deleted_at IS NULL;

-- =============================================
-- TRIGGERS
-- =============================================

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate slug from name
CREATE OR REPLACE FUNCTION generate_product_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
        -- Remove trailing hyphens
        NEW.slug := trim(NEW.slug, '-');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_product_slug ON products;
CREATE TRIGGER trg_generate_product_slug
    BEFORE INSERT ON products
    FOR EACH ROW
    EXECUTE FUNCTION generate_product_slug();

-- =============================================
-- SEED DATA
-- =============================================

-- Get category IDs
DO $$
DECLARE
    electronics_id UUID;
    clothing_id UUID;
    home_id UUID;
    sports_id UUID;
    books_id UUID;
BEGIN
    SELECT id INTO electronics_id FROM categories WHERE slug = 'electronics';
    SELECT id INTO clothing_id FROM categories WHERE slug = 'clothing';
    SELECT id INTO home_id FROM categories WHERE slug = 'home-garden';
    SELECT id INTO sports_id FROM categories WHERE slug = 'sports';
    SELECT id INTO books_id FROM categories WHERE slug = 'books';

    -- Insert sample products
    INSERT INTO products (name, description, price, stock_quantity, category_id, images, is_featured, rating_average, rating_count) VALUES
    ('Wireless Headphones', 'Premium wireless headphones with noise cancellation', 149.99, 50, electronics_id, ARRAY['https://picsum.photos/400/400?random=1'], true, 4.5, 128),
    ('Smart Watch', 'Fitness tracker with heart rate monitor', 299.99, 30, electronics_id, ARRAY['https://picsum.photos/400/400?random=2'], true, 4.2, 89),
    ('Laptop Stand', 'Ergonomic aluminum laptop stand', 79.99, 100, electronics_id, ARRAY['https://picsum.photos/400/400?random=3'], false, 4.8, 256),
    ('USB-C Hub', '7-in-1 USB-C hub with HDMI', 49.99, 75, electronics_id, ARRAY['https://picsum.photos/400/400?random=4'], false, 4.0, 167),
    ('Mechanical Keyboard', 'RGB mechanical gaming keyboard', 129.99, 40, electronics_id, ARRAY['https://picsum.photos/400/400?random=5'], true, 4.7, 312),
    
    ('Denim Jacket', 'Classic denim jacket for men', 89.99, 60, clothing_id, ARRAY['https://picsum.photos/400/400?random=6'], false, 4.3, 78),
    ('Running Shoes', 'Lightweight running shoes', 119.99, 45, clothing_id, ARRAY['https://picsum.photos/400/400?random=7'], true, 4.6, 445),
    ('Wool Scarf', 'Warm wool scarf for winter', 34.99, 90, clothing_id, ARRAY['https://picsum.photos/400/400?random=8'], false, 4.1, 34),
    
    ('Coffee Maker', 'Programmable 12-cup coffee maker', 69.99, 55, home_id, ARRAY['https://picsum.photos/400/400?random=9'], false, 4.4, 198),
    ('Plant Pot Set', 'Set of 3 ceramic plant pots', 39.99, 80, home_id, ARRAY['https://picsum.photos/400/400?random=10'], false, 4.9, 67),
    ('LED Desk Lamp', 'Adjustable LED desk lamp', 45.99, 65, home_id, ARRAY['https://picsum.photos/400/400?random=11'], true, 4.3, 143),
    
    ('Yoga Mat', 'Non-slip exercise yoga mat', 29.99, 120, sports_id, ARRAY['https://picsum.photos/400/400?random=12'], false, 4.7, 523),
    ('Dumbbell Set', 'Adjustable dumbbell set 5-50 lbs', 199.99, 25, sports_id, ARRAY['https://picsum.photos/400/400?random=13'], true, 4.8, 89),
    ('Resistance Bands', 'Set of 5 resistance bands', 24.99, 150, sports_id, ARRAY['https://picsum.photos/400/400?random=14'], false, 4.5, 234),
    
    ('JavaScript Guide', 'Complete JavaScript programming guide', 49.99, 200, books_id, ARRAY['https://picsum.photos/400/400?random=15'], false, 4.9, 678),
    ('Cookbook', '100 easy recipes for beginners', 29.99, 85, books_id, ARRAY['https://picsum.photos/400/400?random=16'], false, 4.2, 156);

    -- Update product counts on categories
    UPDATE categories c SET product_count = (
        SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = true AND p.deleted_at IS NULL
    );

END $$;