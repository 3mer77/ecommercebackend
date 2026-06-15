// src/services/product.service.js
const productModel = require('../models/product.model');
const categoryModel = require('../models/category.model');
const redis = require('../config/redis');

class ProductService {

    /**
     * GET PRODUCTS (Paginated, Filtered, Cached)
     * This is the MOST used endpoint - Heavy caching!
     */
    async getProducts(filters = {}) {
        try {
            // Clean and validate inputs
            const page = parseInt(filters.page) || 1;
            const limit = Math.min(parseInt(filters.limit) || 20, 100);
            const category = filters.category || null;
            const minPrice = filters.minPrice || null;
            const maxPrice = filters.maxPrice || null;
            const inStock = filters.inStock || null;

            // Whitelist sort options (security!)
            const sortOptions = {
                'newest': 'created_at DESC',
                'oldest': 'created_at ASC',
                'price_asc': 'price ASC',
                'price_desc': 'price DESC',
                'bestselling': 'sold_count DESC',
                'rating': 'rating_average DESC',
                'name_asc': 'name ASC',
                'name_desc': 'name DESC'
            };
            const sort = sortOptions[filters.sort] || 'created_at DESC';

            // Build cache key
            const cacheKey = `products:list:${category || 'all'}:${minPrice || 'any'}:${maxPrice || 'any'}:${inStock || 'any'}:${sort}:${page}:${limit}`;

            // CHECK REDIS CACHE FIRST
            const cached = await redis.get(cacheKey);
            if (cached) {
                console.log('⚡ Products from CACHE');
                return JSON.parse(cached);
            }

            // Cache miss - query database
            console.log('🐌 Products from DATABASE');
            const result = await productModel.findAll({
                page, limit, category, sort, minPrice, maxPrice, inStock
            });

            // Add business logic: Calculate discount percentage
            result.products = result.products.map(product => ({
                ...product,
                discount_percentage: product.compare_at_price
                    ? Math.round((1 - product.price / product.compare_at_price) * 100)
                    : 0
            }));

            // Save to cache for 10 minutes (600 seconds)
            await redis.setex(cacheKey, 600, JSON.stringify(result));
            console.log('💾 Products cached for 10 minutes');

            return result;

        } catch (error) {
            throw error;
        }
    }

    /**
     * GET SINGLE PRODUCT
     */
    async getProductById(id) {
        try {
            // Check cache first
            const cacheKey = `product:single:${id}`;
            const cached = await redis.get(cacheKey);

            if (cached) {
                console.log(' Product from CACHE');
                return { product: JSON.parse(cached) };
            }

            console.log(' Product from DATABASE');
            const product = await productModel.findById(id);

            if (!product) {
                const error = new Error('Product not found');
                error.statusCode = 404;
                throw error;
            }

            // Cache for 30 minutes (products don't change often)
            await redis.setex(cacheKey, 1800, JSON.stringify(product));

            return { product };

        } catch (error) {
            throw error;
        }
    }

    /**
     * SEARCH PRODUCTS
     */
    async searchProducts(searchTerm, { page = 1, limit = 20 } = {}) {
        try {
            if (!searchTerm || searchTerm.trim().length === 0) {
                const error = new Error('Search term is required');
                error.statusCode = 400;
                throw error;
            }

            const safePage = parseInt(page) || 1;
            const safeLimit = Math.min(parseInt(limit) || 20, 50);

            // Cache search results (shorter TTL - searches vary more)
            const cacheKey = `products:search:${searchTerm.toLowerCase().trim()}:${safePage}:${safeLimit}`;
            const cached = await redis.get(cacheKey);

            if (cached) {
                console.log('⚡ Search results from CACHE');
                return JSON.parse(cached);
            }

            console.log('🐌 Search from DATABASE');
            const result = await productModel.search(searchTerm, {
                page: safePage,
                limit: safeLimit
            });

            const response = {
                products: result.products,
                searchTerm: searchTerm,
                total: result.total,
                page: safePage,
                limit: safeLimit
            };

            // Cache search for 5 minutes
            await redis.setex(cacheKey, 300, JSON.stringify(response));

            return response;

        } catch (error) {
            throw error;
        }
    }

    /**
     * CREATE PRODUCT (Admin only)
     */
    async createProduct(productData) {
        try {
            // Business validation
            if (!productData.name || productData.name.trim().length < 2) {
                const error = new Error('Product name must be at least 2 characters');
                error.statusCode = 400;
                throw error;
            }

            if (!productData.price || productData.price <= 0) {
                const error = new Error('Price must be greater than zero');
                error.statusCode = 400;
                throw error;
            }

            if (productData.stock_quantity < 0) {
                const error = new Error('Stock quantity cannot be negative');
                error.statusCode = 400;
                throw error;
            }

            // Create product
            const product = await productModel.create(productData);

            // Invalidate cache (new product changes listings)
            await this.clearProductCache();

            return { product };

        } catch (error) {
            throw error;
        }
    }

    /**
     * UPDATE PRODUCT (Admin only)
     */
    async updateProduct(id, updates) {
        try {
            // Check if product exists
            const existing = await productModel.findById(id);
            if (!existing) {
                const error = new Error('Product not found');
                error.statusCode = 404;
                throw error;
            }

            // Validate price if updating
            if (updates.price !== undefined && updates.price <= 0) {
                const error = new Error('Price must be greater than zero');
                error.statusCode = 400;
                throw error;
            }

            // Update product
            const product = await productModel.update(id, updates);

            // Invalidate cache
            await this.clearProductCache();
            await redis.del(`product:single:${id}`);

            return { product };

        } catch (error) {
            throw error;
        }
    }

    /**
     * DELETE PRODUCT (Admin only) - Soft delete
     */
    async deleteProduct(id) {
        try {
            const product = await productModel.findById(id);
            if (!product) {
                const error = new Error('Product not found');
                error.statusCode = 404;
                throw error;
            }

            await productModel.delete(id);

            // Invalidate cache
            await this.clearProductCache();
            await redis.del(`product:single:${id}`);

            return { message: 'Product deleted successfully' };

        } catch (error) {
            throw error;
        }
    }

    /**
     * UPDATE STOCK (Admin only)
     */
    async updateStock(id, quantity, operation) {
        try {
            if (!quantity || quantity <= 0) {
                const error = new Error('Quantity must be greater than zero');
                error.statusCode = 400;
                throw error;
            }

            if (!['add', 'subtract', 'set'].includes(operation)) {
                const error = new Error('Operation must be: add, subtract, or set');
                error.statusCode = 400;
                throw error;
            }

            const result = await productModel.updateStock(id, quantity, operation);

            // Invalidate cache
            await redis.del(`product:single:${id}`);

            return result;

        } catch (error) {
            throw error;
        }
    }

    /**
     * GET CATEGORIES
     */
    async getCategories() {
        try {
            // Check cache
            const cacheKey = 'categories:all';
            const cached = await redis.get(cacheKey);

            if (cached) {
                console.log('⚡ Categories from CACHE');
                return { categories: JSON.parse(cached) };
            }

            console.log('🐌 Categories from DATABASE');
            const categories = await categoryModel.findAll();

            // Cache for 1 hour (categories rarely change)
            await redis.setex(cacheKey, 3600, JSON.stringify(categories));

            return { categories };

        } catch (error) {
            throw error;
        }
    }

    /**
     * GET PRODUCTS BY CATEGORY
     */
    async getProductsByCategory(slug, { page = 1, limit = 20 } = {}) {
        try {
            const category = await categoryModel.findBySlug(slug);
            if (!category) {
                const error = new Error('Category not found');
                error.statusCode = 404;
                throw error;
            }

            const result = await this.getProducts({
                category: slug,
                page,
                limit
            });

            return {
                category,
                ...result
            };

        } catch (error) {
            throw error;
        }
    }

    /**
     * CLEAR PRODUCT CACHE (Helper)
     */
    async clearProductCache() {
        try {
            // Delete all product list cache keys
            const keys = await redis.keys('products:list:*');
            if (keys.length > 0) {
                await redis.del(keys);
                console.log(`🧹 Cleared ${keys.length} product cache keys`);
            }
        } catch (error) {
            console.error('Error clearing cache:', error.message);
        }
    }
}

module.exports = new ProductService();