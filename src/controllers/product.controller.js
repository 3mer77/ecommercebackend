// src/controllers/product.controller.js
const productService = require('../services/product.service');
const ResponseHandler = require('../utils/response');

class ProductController {

    /**
     * GET ALL PRODUCTS
     * Public - Anyone can browse products
     */
    async getAll(req, res, next) {
        try {
            const filters = {
                page: req.query.page,
                limit: req.query.limit,
                category: req.query.category,
                sort: req.query.sort,
                minPrice: req.query.minPrice,
                maxPrice: req.query.maxPrice,
                inStock: req.query.inStock
            };

            const result = await productService.getProducts(filters);

            return ResponseHandler.success(res, result, 'Products retrieved successfully');

        } catch (error) {
            next(error);
        }
    }

    /**
     * GET SINGLE PRODUCT
     * Public - Anyone can view a product
     */
    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const result = await productService.getProductById(id);

            return ResponseHandler.success(res, result, 'Product retrieved successfully');

        } catch (error) {
            next(error);
        }
    }

    /**
     * SEARCH PRODUCTS
     * Public - Anyone can search
     */
    async search(req, res, next) {
        try {
            const { q, page, limit } = req.query;
            const result = await productService.searchProducts(q, { page, limit });

            return ResponseHandler.success(res, result, 'Search completed');

        } catch (error) {
            next(error);
        }
    }

    /**
     * CREATE PRODUCT
     * Admin only - Requires authentication + admin role
     */
    async create(req, res, next) {
        try {
            const productData = {
                name: req.body.name,
                description: req.body.description,
                price: req.body.price,
                stock_quantity: req.body.stock_quantity,
                category_id: req.body.category_id,
                images: req.body.images,
                sku: req.body.sku
            };

            const result = await productService.createProduct(productData);

            return ResponseHandler.created(res, result, 'Product created successfully');

        } catch (error) {
            next(error);
        }
    }

    /**
     * UPDATE PRODUCT
     * Admin only
     */
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const updates = req.body;

            // Only allow these fields to be updated
            const allowedUpdates = ['name', 'description', 'price', 'stock_quantity', 'category_id', 'images', 'is_active', 'is_featured'];
            const filteredUpdates = {};

            Object.keys(updates).forEach(key => {
                if (allowedUpdates.includes(key)) {
                    filteredUpdates[key] = updates[key];
                }
            });

            const result = await productService.updateProduct(id, filteredUpdates);

            return ResponseHandler.success(res, result, 'Product updated successfully');

        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE PRODUCT (Soft Delete)
     * Admin only
     */
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const result = await productService.deleteProduct(id);

            return ResponseHandler.success(res, result, 'Product deleted successfully');

        } catch (error) {
            next(error);
        }
    }

    /**
     * UPDATE STOCK
     * Admin only
     */
    async updateStock(req, res, next) {
        try {
            const { id } = req.params;
            const { quantity, operation } = req.body;

            const result = await productService.updateStock(id, quantity, operation);

            return ResponseHandler.success(res, result, 'Stock updated successfully');

        } catch (error) {
            next(error);
        }
    }

    /**
     * GET CATEGORIES
     * Public
     */
    async getCategories(req, res, next) {
        try {
            const result = await productService.getCategories();

            return ResponseHandler.success(res, result, 'Categories retrieved');

        } catch (error) {
            next(error);
        }
    }

    /**
     * GET PRODUCTS BY CATEGORY
     * Public
     */
    async getByCategory(req, res, next) {
        try {
            const { slug } = req.params;
            const { page, limit } = req.query;

            const result = await productService.getProductsByCategory(slug, { page, limit });

            return ResponseHandler.success(res, result, 'Category products retrieved');

        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ProductController();