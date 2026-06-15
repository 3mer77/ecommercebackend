// src/controllers/cart.controller.js
const cartService = require('../services/cart.service');
const ResponseHandler = require('../utils/response');

class CartController {

    async getCart(req, res, next) {
        try {
            const cart = await cartService.getCart(req.user.id);
            return ResponseHandler.success(res, { cart }, 'Cart retrieved');
        } catch (error) {
            next(error);
        }
    }

    async addToCart(req, res, next) {
        try {
            const { productId, quantity } = req.body;
            const cart = await cartService.addToCart(req.user.id, { productId, quantity });
            return ResponseHandler.success(res, { cart }, 'Item added to cart');
        } catch (error) {
            next(error);
        }
    }

    async updateQuantity(req, res, next) {
        try {
            const { itemId } = req.params;
            const { quantity } = req.body;
            const cart = await cartService.updateQuantity(req.user.id, itemId, quantity);
            return ResponseHandler.success(res, { cart }, 'Quantity updated');
        } catch (error) {
            next(error);
        }
    }

    async removeFromCart(req, res, next) {
        try {
            const { itemId } = req.params;
            const cart = await cartService.removeFromCart(req.user.id, itemId);
            return ResponseHandler.success(res, { cart }, 'Item removed from cart');
        } catch (error) {
            next(error);
        }
    }

    async clearCart(req, res, next) {
        try {
            const result = await cartService.clearCart(req.user.id);
            return ResponseHandler.success(res, result, 'Cart cleared');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CartController();