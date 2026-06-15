// src/services/cart.service.js
const cartModel = require('../models/cart.model');
const productModel = require('../models/product.model');
const redis = require('../config/redis');

class CartService {

    async getCart(userId) {
        try {
            // Check cache
            const cacheKey = `cart:${userId}`;
            const cached = await redis.get(cacheKey);

            if (cached) {
                console.log('⚡ Cart from CACHE');
                return JSON.parse(cached);
            }

            console.log('🐌 Cart from DATABASE');
            const cart = await cartModel.getCartWithItems(userId);

            // Add calculated fields
            const enrichedCart = {
                ...cart,
                items: cart.items.map(item => ({
                    ...item,
                    subtotal: (item.product_price * item.quantity).toFixed(2),
                    is_available: item.is_in_stock && item.stock_quantity >= item.quantity
                })),
                total_items: cart.items.reduce((sum, item) => sum + item.quantity, 0),
                total_amount: cart.items.reduce((sum, item) => sum + (item.product_price * item.quantity), 0).toFixed(2)
            };

            // Cache for 2 minutes
            await redis.setex(cacheKey, 120, JSON.stringify(enrichedCart));

            return enrichedCart;
        } catch (error) {
            throw error;
        }
    }

    async addToCart(userId, { productId, quantity = 1 }) {
        try {
            // Validate product exists and has stock
            const product = await productModel.findById(productId);
            if (!product) {
                const error = new Error('Product not found');
                error.statusCode = 404;
                throw error;
            }

            if (product.stock_quantity < quantity) {
                const error = new Error(`Only ${product.stock_quantity} items available`);
                error.statusCode = 400;
                throw error;
            }

            // Get or create cart
            const cart = await cartModel.getOrCreateCart(userId);

            // Add item
            await cartModel.addItem(cart.id, {
                product_id: productId,
                quantity,
                product_name: product.name,
                product_price: product.price,
                product_image: product.images?.[0] || null
            });

            // Update totals
            await cartModel.updateCartTotals(cart.id);

            // Clear cache
            await redis.del(`cart:${userId}`);

            // Return updated cart
            return this.getCart(userId);

        } catch (error) {
            throw error;
        }
    }

    async updateQuantity(userId, itemId, quantity) {
        try {
            const cart = await cartModel.getOrCreateCart(userId);

            const updated = await cartModel.updateItemQuantity(cart.id, itemId, quantity);
            if (!updated) {
                const error = new Error('Item not found in cart');
                error.statusCode = 404;
                throw error;
            }

            await cartModel.updateCartTotals(cart.id);
            await redis.del(`cart:${userId}`);

            return this.getCart(userId);

        } catch (error) {
            throw error;
        }
    }

    async removeFromCart(userId, itemId) {
        try {
            const cart = await cartModel.getOrCreateCart(userId);

            const removed = await cartModel.removeItem(cart.id, itemId);
            if (!removed) {
                const error = new Error('Item not found in cart');
                error.statusCode = 404;
                throw error;
            }

            await cartModel.updateCartTotals(cart.id);
            await redis.del(`cart:${userId}`);

            return this.getCart(userId);

        } catch (error) {
            throw error;
        }
    }

    async clearCart(userId) {
        try {
            const cart = await cartModel.getOrCreateCart(userId);
            await cartModel.clearCart(cart.id);
            await cartModel.updateCartTotals(cart.id);
            await redis.del(`cart:${userId}`);

            return { message: 'Cart cleared' };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new CartService();