// src/models/cart.model.js
const db = require('../config/database');

class CartModel {

    // Get or create user's active cart
    async getOrCreateCart(userId) {
        // Check if active cart exists
        let result = await db.query(
            'SELECT * FROM carts WHERE user_id = $1 AND is_active = true',
            [userId]
        );

        if (result.rows.length > 0) {
            return result.rows[0];
        }

        // Create new cart
        result = await db.query(
            'INSERT INTO carts (user_id) VALUES ($1) RETURNING *',
            [userId]
        );

        return result.rows[0];
    }

    // Get cart with all items
    async getCartWithItems(userId) {
        const cart = await this.getOrCreateCart(userId);

        const items = await db.query(
            `SELECT ci.*, p.stock_quantity, p.is_in_stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = $1
       ORDER BY ci.created_at DESC`,
            [cart.id]
        );

        return {
            ...cart,
            items: items.rows
        };
    }

    // Add item to cart
    async addItem(cartId, productData) {
        return db.transaction(async (client) => {
            const { product_id, quantity, product_name, product_price, product_image } = productData;

            // Check if item already exists
            const existing = await client.query(
                'SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2',
                [cartId, product_id]
            );

            if (existing.rows.length > 0) {
                // Update quantity
                const newQty = existing.rows[0].quantity + quantity;
                if (newQty > 99) throw new Error('Maximum 99 items per product');

                const result = await client.query(
                    'UPDATE cart_items SET quantity = $3, updated_at = NOW() WHERE cart_id = $1 AND product_id = $2 RETURNING *',
                    [cartId, product_id, newQty]
                );
                return result.rows[0];
            }

            // Insert new item
            const result = await client.query(
                `INSERT INTO cart_items (cart_id, product_id, quantity, product_name, product_price, product_image)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [cartId, product_id, quantity, product_name, product_price, product_image]
            );

            return result.rows[0];
        });
    }

    // Update item quantity
    async updateItemQuantity(cartId, itemId, quantity) {
        const result = await db.query(
            `UPDATE cart_items 
       SET quantity = $3, updated_at = NOW() 
       WHERE id = $1 AND cart_id = $2 
       RETURNING *`,
            [itemId, cartId, quantity]
        );
        return result.rows[0];
    }

    // Remove item from cart
    async removeItem(cartId, itemId) {
        const result = await db.query(
            'DELETE FROM cart_items WHERE id = $1 AND cart_id = $2 RETURNING *',
            [itemId, cartId]
        );
        return result.rows[0];
    }

    // Clear entire cart
    async clearCart(cartId) {
        await db.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
    }

    // Update cart totals (called after changes)
    async updateCartTotals(cartId) {
        const result = await db.query(
            `UPDATE carts c SET 
        items_count = (SELECT COALESCE(SUM(quantity), 0) FROM cart_items WHERE cart_id = $1),
        total_amount = (SELECT COALESCE(SUM(product_price * quantity), 0) FROM cart_items WHERE cart_id = $1),
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
            [cartId]
        );
        return result.rows[0];
    }

    // Deactivate cart (after order placed)
    async deactivateCart(cartId) {
        await db.query(
            'UPDATE carts SET is_active = false, updated_at = NOW() WHERE id = $1',
            [cartId]
        );
    }
}

module.exports = new CartModel();