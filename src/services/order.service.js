// src/services/order.service.js
const orderModel = require('../models/order.model');
const cartModel = require('../models/cart.model');

class OrderService {

    async createOrder(userId, shippingAddress = {}) {
        // Get cart with items
        const cart = await cartModel.getCartWithItems(userId);

        if (!cart.items || cart.items.length === 0) {
            const error = new Error('Cart is empty');
            error.statusCode = 400;
            throw error;
        }

        // Validate stock
        for (const item of cart.items) {
            if (!item.is_in_stock || item.stock_quantity < item.quantity) {
                const error = new Error(`Insufficient stock for ${item.product_name}`);
                error.statusCode = 400;
                throw error;
            }
        }

        // Create order (transaction handles stock deduction + cart clearing)
        const order = await orderModel.create(userId, cart.items, shippingAddress);

        return this.findById(order.id, userId);
    }

    async findById(orderId, userId = null) {
        const order = await orderModel.findById(orderId, userId);

        if (!order) {
            const error = new Error('Order not found');
            error.statusCode = 404;
            throw error;
        }

        return order;
    }

    async getMyOrders(userId, { page, limit } = {}) {
        return orderModel.findByUser(userId, { page, limit });
    }

    async updateStatus(orderId, status) {
        const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

        if (!validStatuses.includes(status)) {
            const error = new Error(`Invalid status. Must be: ${validStatuses.join(', ')}`);
            error.statusCode = 400;
            throw error;
        }

        const order = await orderModel.updateStatus(orderId, status);

        if (!order) {
            const error = new Error('Order not found');
            error.statusCode = 404;
            throw error;
        }

        return order;
    }

    async getAllOrders({ page, limit, status } = {}) {
        return orderModel.findAll({ page, limit, status });
    }
}

module.exports = new OrderService();