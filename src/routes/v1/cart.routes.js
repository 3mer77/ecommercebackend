// src/routes/v1/cart.routes.js

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Shopping cart management
 */

const express = require('express');
const router = express.Router();
const cartController = require('../../controllers/cart.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { addToCartValidation, updateQuantityValidation, validate } = require('../../validators/cart.validator');

// All cart routes are protected
router.use(authenticate);

/**
 * @swagger
 * /cart:
 *   get:
 *     summary: Get current user's cart
 *     tags: [Cart]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Cart retrieved successfully
 *       401:
 *         description: Not authenticated
 */
router.get('/', cartController.getCart);

/**
 * @swagger
 * /cart/items:
 *   post:
 *     summary: Add item to cart
 *     tags: [Cart]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 99
 *                 default: 1
 *     responses:
 *       200:
 *         description: Item added to cart
 *       400:
 *         description: Insufficient stock
 *       404:
 *         description: Product not found
 */
router.post('/items', addToCartValidation, validate, cartController.addToCart);

/**
 * @swagger
 * /cart/items/{itemId}:
 *   put:
 *     summary: Update item quantity
 *     tags: [Cart]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 99
 *     responses:
 *       200:
 *         description: Quantity updated
 *       404:
 *         description: Item not found
 */
router.put('/items/:itemId', updateQuantityValidation, validate, cartController.updateQuantity);

/**
 * @swagger
 * /cart/items/{itemId}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Cart]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item removed
 *       404:
 *         description: Item not found
 */
router.delete('/items/:itemId', cartController.removeFromCart);

/**
 * @swagger
 * /cart:
 *   delete:
 *     summary: Clear entire cart
 *     tags: [Cart]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared
 */
router.delete('/', cartController.clearCart);

module.exports = router;