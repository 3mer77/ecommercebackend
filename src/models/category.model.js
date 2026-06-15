
const db = require('../config/database');

class CategoryModel {

    async findAll() {
        const query = `
      SELECT id, name, slug, description, image_url, product_count
      FROM categories
      WHERE is_active = true
      ORDER BY name ASC
    `;
        const result = await db.query(query);
        return result.rows;
    }

    async findBySlug(slug) {
        const query = `
      SELECT id, name, slug, description, image_url, product_count
      FROM categories
      WHERE slug = $1 AND is_active = true
    `;
        const result = await db.query(query, [slug]);
        return result.rows[0];
    }

    async findById(id) {
        const query = `
      SELECT id, name, slug, description, image_url, product_count
      FROM categories
      WHERE id = $1
    `;
        const result = await db.query(query, [id]);
        return result.rows[0];
    }
}

module.exports = new CategoryModel();