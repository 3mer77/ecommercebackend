/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management and browsing
 */

const express = require('express');
const router = express.Router();
const productController = require('../../controllers/product.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/role.middleware');
const {
    createProductValidation,
    updateStockValidation,
    validate
} = require('../../validators/product.validator');

// ──────────────────────────────────────
// PUBLIC ROUTES
// ──────────────────────────────────────

/**
 * @swagger
 * /products:
 *   get:
 *     summary: List all products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category slug
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest, price_asc, price_desc, bestselling, rating]
 *         description: Sort order
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: inStock
 *         schema:
 *           type: boolean
 *         description: Show only in-stock items
 *     responses:
 *       200:
 *         description: Products retrieved
 */
router.get('/', productController.getAll);

/**
 * @swagger
 * /products/search:
 *   get:
 *     summary: Search products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', productController.search);

/**
 * @swagger
 * /products/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Categories retrieved
 */
router.get('/categories', productController.getCategories);

/**
 * @swagger
 * /products/category/{slug}:
 *   get:
 *     summary: Get products by category
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category products
 */
router.get('/category/:slug', productController.getByCategory);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get single product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product retrieved
 *       404:
 *         description: Product not found
 */
router.get('/:id', productController.getById);

// ──────────────────────────────────────
// PROTECTED ROUTES (Admin only)
// ──────────────────────────────────────

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create product (Admin)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock_quantity:
 *                 type: integer
 *               category_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin only
 */
router.post('/',
    authenticate,
    authorize('admin'),
    createProductValidation,
    validate,
    productController.create
);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update product (Admin)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product updated
 */
router.put('/:id',
    authenticate,
    authorize('admin'),
    productController.update
);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete product (Admin)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted
 */
router.delete('/:id',
    authenticate,
    authorize('admin'),
    productController.delete
);

/**
 * @swagger
 * /products/{id}/stock:
 *   patch:
 *     summary: Update stock (Admin)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - operation
 *             properties:
 *               quantity:
 *                 type: integer
 *               operation:
 *                 type: string
 *                 enum: [add, subtract, set]
 *     responses:
 *       200:
 *         description: Stock updated
 */
router.patch('/:id/stock',
    authenticate,
    authorize('admin'),
    updateStockValidation,
    validate,
    productController.updateStock
);

module.exports = router;