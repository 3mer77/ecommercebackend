// src/models/order.model.js
const db = require('../config/database');

class OrderModel {

    async create(userId, cartItems, shippingAddress) {
        return db.transaction(async (client) => {
            // Calculate totals
            const subtotal = cartItems.reduce((sum, item) => sum + (item.product_price * item.quantity), 0);
            const total = subtotal; // Add tax/shipping later

            // Create order
            const orderResult = await client.query(
                `INSERT INTO orders (user_id, subtotal, total_amount, shipping_address, status)
         VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
                [userId, subtotal, total, JSON.stringify(shippingAddress)]
            );
            const order = orderResult.rows[0];

            // Create order items & deduct stock
            for (const item of cartItems) {
                await client.query(
                    `INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6)`,
                    [order.id, item.product_id, item.product_name, item.product_price, item.quantity, item.product_price * item.quantity]
                );

                // Deduct stock
                await client.query(
                    'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2 AND stock_quantity >= $1',
                    [item.quantity, item.product_id]
                );

                // Update sold count
                await client.query(
                    'UPDATE products SET sold_count = sold_count + $1 WHERE id = $2',
                    [item.quantity, item.product_id]
                );
            }

            // Clear cart
            await client.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = $1)', [userId]);

            return order;
        });
    }

    async findById(orderId, userId = null) {
        let query = `
      SELECT o.*, 
             json_agg(json_build_object(
               'id', oi.id, 'product_id', oi.product_id,
               'product_name', oi.product_name, 'product_price', oi.product_price,
               'quantity', oi.quantity, 'subtotal', oi.subtotal
             )) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1
    `;
        const params = [orderId];

        if (userId) {
            query += ' AND o.user_id = $2';
            params.push(userId);
        }

        query += ' GROUP BY o.id';

        const result = await db.query(query, params);
        return result.rows[0];
    }

    async findByUser(userId, { page = 1, limit = 10 } = {}) {
        const offset = (page - 1) * limit;

        const query = `
      SELECT o.*,
             (SELECT json_agg(json_build_object(
               'id', oi.id, 'product_name', oi.product_name,
               'quantity', oi.quantity, 'subtotal', oi.subtotal
             )) FROM order_items oi WHERE oi.order_id = o.id) as items
      FROM orders o
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
      LIMIT $2 OFFSET $3
    `;

        const countQuery = 'SELECT COUNT(*) FROM orders WHERE user_id = $1';

        const [ordersResult, countResult] = await Promise.all([
            db.query(query, [userId, limit, offset]),
            db.query(countQuery, [userId])
        ]);

        return {
            orders: ordersResult.rows,
            total: parseInt(countResult.rows[0].count),
            page,
            limit
        };
    }

    async updateStatus(orderId, status, userId = null) {
        let query = 'UPDATE orders SET status = $2 WHERE id = $1';
        const params = [orderId, status];

        if (userId) {
            query += ' AND user_id = $3';
            params.push(userId);
        }

        query += ' RETURNING *';
        const result = await db.query(query, params);
        return result.rows[0];
    }

    async findAll({ page = 1, limit = 20, status } = {}) {
        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];
        let paramCount = 1;

        if (status) {
            conditions.push(`o.status = $${paramCount}`);
            params.push(status);
            paramCount++;
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        const query = `
      SELECT o.*, u.email, u.username
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

        const countQuery = `SELECT COUNT(*) FROM orders o ${whereClause}`;

        params.push(limit, offset);
        const countParams = params.slice(0, -2);

        const [ordersResult, countResult] = await Promise.all([
            db.query(query, params),
            db.query(countQuery, countParams)
        ]);

        return {
            orders: ordersResult.rows,
            total: parseInt(countResult.rows[0].count),
            page,
            limit
        };
    }
}

module.exports = new OrderModel();