// src/models/product.model.js
const db = require('../config/database');

class ProductModel {

    async findById(id) {
        const query = `
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1 AND p.deleted_at IS NULL
    `;
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    async findBySlug(slug) {
        const query = `
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = $1 AND p.deleted_at IS NULL
    `;
        const result = await db.query(query, [slug]);
        return result.rows[0];
    }

    async findAll({ page = 1, limit = 20, category, sort = 'created_at DESC', minPrice, maxPrice, inStock }) {
        const offset = (page - 1) * limit;
        const conditions = ['p.is_active = true', 'p.deleted_at IS NULL'];
        const params = [];
        let paramCount = 1;

        if (category) {
            conditions.push(`c.slug = $${paramCount}`);
            params.push(category);
            paramCount++;
        }

        if (minPrice) {
            conditions.push(`p.price >= $${paramCount}`);
            params.push(minPrice);
            paramCount++;
        }

        if (maxPrice) {
            conditions.push(`p.price <= $${paramCount}`);
            params.push(maxPrice);
            paramCount++;
        }

        if (inStock === 'true') {
            conditions.push('p.is_in_stock = true');
        }

        const whereClause = conditions.join(' AND ');

        const query = `
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${whereClause}
      ORDER BY ${sort}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

        params.push(limit, offset);
        const result = await db.query(query, params);

        // Count total
        const countQuery = `
      SELECT COUNT(*) 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${whereClause}
    `;
        const countResult = await db.query(countQuery, params.slice(0, -2));
        const total = parseInt(countResult.rows[0].count);

        return {
            products: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
                hasMore: offset + result.rows.length < total
            }
        };
    }

    async search(searchTerm, { page = 1, limit = 20 } = {}) {
        const offset = (page - 1) * limit;

        const query = `
      SELECT p.*, c.name as category_name, c.slug as category_slug,
             ts_rank(
               to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')),
               plainto_tsquery('english', $1)
             ) as relevance
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true 
        AND p.deleted_at IS NULL
        AND to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')) 
            @@ plainto_tsquery('english', $1)
      ORDER BY relevance DESC
      LIMIT $2 OFFSET $3
    `;

        const result = await db.query(query, [searchTerm, limit, offset]);

        const countQuery = `
      SELECT COUNT(*) 
      FROM products p
      WHERE p.is_active = true 
        AND p.deleted_at IS NULL
        AND to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')) 
            @@ plainto_tsquery('english', $1)
    `;
        const countResult = await db.query(countQuery, [searchTerm]);

        return {
            products: result.rows,
            total: parseInt(countResult.rows[0].count)
        };
    }

    async create(productData) {
        const { name, description, price, stock_quantity, category_id, images, sku } = productData;

        const query = `
      INSERT INTO products (name, description, price, stock_quantity, category_id, images, sku)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

        const result = await db.query(query, [
            name, description, price, stock_quantity || 0, category_id, images || [], sku
        ]);
        return result.rows[0];
    }

    async update(id, updates) {
        const keys = Object.keys(updates);
        const values = Object.values(updates);
        const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');

        const query = `
      UPDATE products 
      SET ${setClause}, version = version + 1, updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;

        const result = await db.query(query, [id, ...values]);
        return result.rows[0];
    }

    async delete(id) {
        // Soft delete
        const query = `
      UPDATE products 
      SET deleted_at = NOW(), is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `;
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    async updateStock(id, quantity, operation) {
        return db.transaction(async (client) => {
            // Get current stock
            const { rows } = await client.query(
                'SELECT stock_quantity, version FROM products WHERE id = $1 FOR UPDATE',
                [id]
            );

            if (rows.length === 0) throw new Error('Product not found');

            const current = rows[0];
            let newQuantity;

            if (operation === 'add') newQuantity = current.stock_quantity + quantity;
            else if (operation === 'subtract') {
                if (current.stock_quantity < quantity) throw new Error('Insufficient stock');
                newQuantity = current.stock_quantity - quantity;
            } else if (operation === 'set') newQuantity = quantity;
            else throw new Error('Invalid operation');

            const result = await client.query(
                'UPDATE products SET stock_quantity = $2, version = version + 1 WHERE id = $1 RETURNING *',
                [id, newQuantity]
            );

            return {
                product: result.rows[0],
                previousStock: current.stock_quantity,
                newStock: newQuantity
            };
        });
    }
}

module.exports = new ProductModel();