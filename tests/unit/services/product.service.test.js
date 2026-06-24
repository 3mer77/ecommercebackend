// tests/unit/services/product.service.test.js

// Mock dependencies
jest.mock('../../../src/models/product.model');
jest.mock('../../../src/models/category.model');
jest.mock('../../../src/config/redis');

const productService = require('../../../src/services/product.service');
const productModel = require('../../../src/models/product.model');
const categoryModel = require('../../../src/models/category.model');
const redis = require('../../../src/config/redis');

describe('Product Service', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        redis.get.mockResolvedValue(null); // No cache by default
        redis.setex.mockResolvedValue('OK');
        redis.keys.mockResolvedValue([]);
        redis.del.mockResolvedValue(1);
    });

    describe('getProducts', () => {

        test('should return paginated products', async () => {
            const mockResult = {
                products: [{ id: '1', name: 'Test Product', price: 99.99 }],
                pagination: { page: 1, limit: 20, total: 1, pages: 1, hasMore: false }
            };
            productModel.findAll.mockResolvedValue(mockResult);

            const result = await productService.getProducts({ page: 1, limit: 20 });

            expect(result.products).toHaveLength(1);
            expect(result.pagination.page).toBe(1);
        });

        test('should return cached products if available', async () => {
            const cachedData = { products: [{ id: '2', name: 'Cached' }], pagination: {} };
            redis.get.mockResolvedValue(JSON.stringify(cachedData));

            const result = await productService.getProducts({});

            expect(result.products[0].name).toBe('Cached');
            expect(productModel.findAll).not.toHaveBeenCalled();
        });

        test('should filter by category', async () => {
            productModel.findAll.mockResolvedValue({ products: [], pagination: {} });

            await productService.getProducts({ category: 'electronics' });

            expect(productModel.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ category: 'electronics' })
            );
        });

        test('should filter by price range', async () => {
            productModel.findAll.mockResolvedValue({ products: [], pagination: {} });

            await productService.getProducts({ minPrice: 10, maxPrice: 100 });

            expect(productModel.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ minPrice: 10, maxPrice: 100 })
            );
        });
    });

    describe('getProductById', () => {

        test('should return product when found', async () => {
            const mockProduct = { id: '1', name: 'Test', price: 99.99 };
            productModel.findById.mockResolvedValue(mockProduct);

            const result = await productService.getProductById('1');

            expect(result.product.name).toBe('Test');
        });

        test('should throw error when product not found', async () => {
            productModel.findById.mockResolvedValue(null);

            await expect(
                productService.getProductById('nonexistent')
            ).rejects.toThrow('Product not found');
        });

        test('should return cached product if available', async () => {
            const cachedProduct = { id: '3', name: 'Cached Product' };
            redis.get.mockResolvedValue(JSON.stringify(cachedProduct));

            const result = await productService.getProductById('3');

            expect(result.product.name).toBe('Cached Product');
            expect(productModel.findById).not.toHaveBeenCalled();
        });
    });

    describe('searchProducts', () => {

        test('should return search results', async () => {
            productModel.search.mockResolvedValue({
                products: [{ id: '1', name: 'Headphones' }],
                total: 1
            });

            const result = await productService.searchProducts('headphones');

            expect(result.products).toHaveLength(1);
            expect(result.searchTerm).toBe('headphones');
        });

        test('should throw error for empty search term', async () => {
            await expect(
                productService.searchProducts('')
            ).rejects.toThrow('Search term is required');
        });

        test('should return cached search results', async () => {
            const cached = { products: [], searchTerm: 'test', total: 0 };
            redis.get.mockResolvedValue(JSON.stringify(cached));

            const result = await productService.searchProducts('test');

            expect(result.searchTerm).toBe('test');
            expect(productModel.search).not.toHaveBeenCalled();
        });
    });

    describe('createProduct', () => {

        test('should create product successfully', async () => {
            const productData = { name: 'New', price: 99.99, stock_quantity: 50 };
            productModel.create.mockResolvedValue({ id: '1', ...productData });

            const result = await productService.createProduct(productData);

            expect(result.product.name).toBe('New');
        });

        test('should reject empty name', async () => {
            await expect(
                productService.createProduct({ name: '', price: 99 })
            ).rejects.toThrow('Product name must be at least 2 characters');
        });

        test('should reject negative price', async () => {
            await expect(
                productService.createProduct({ name: 'Test', price: -10 })
            ).rejects.toThrow('Price must be greater than zero');
        });

        test('should reject negative stock', async () => {
            await expect(
                productService.createProduct({ name: 'Test', price: 10, stock_quantity: -5 })
            ).rejects.toThrow('Stock quantity cannot be negative');
        });
    });

    describe('updateProduct', () => {

        test('should update product successfully', async () => {
            productModel.findById.mockResolvedValue({ id: '1', name: 'Old' });
            productModel.update.mockResolvedValue({ id: '1', name: 'Updated', price: 149.99 });

            const result = await productService.updateProduct('1', { name: 'Updated', price: 149.99 });

            expect(result.product.name).toBe('Updated');
        });

        test('should throw error if product not found', async () => {
            productModel.findById.mockResolvedValue(null);

            await expect(
                productService.updateProduct('nonexistent', { name: 'New' })
            ).rejects.toThrow('Product not found');
        });
    });

    describe('deleteProduct', () => {

        test('should soft delete product', async () => {
            productModel.findById.mockResolvedValue({ id: '1', name: 'To Delete' });
            productModel.delete.mockResolvedValue({ id: '1' });

            const result = await productService.deleteProduct('1');

            expect(result.message).toBe('Product deleted successfully');
        });

        test('should throw error if product not found', async () => {
            productModel.findById.mockResolvedValue(null);

            await expect(
                productService.deleteProduct('nonexistent')
            ).rejects.toThrow('Product not found');
        });
    });

    describe('updateStock', () => {

        test('should add stock', async () => {
            productModel.updateStock.mockResolvedValue({
                product: { stock_quantity: 150 },
                previousStock: 100,
                newStock: 150
            });

            const result = await productService.updateStock('1', 50, 'add');

            expect(result.newStock).toBe(150);
        });

        test('should subtract stock', async () => {
            productModel.updateStock.mockResolvedValue({
                product: { stock_quantity: 70 },
                previousStock: 100,
                newStock: 70
            });

            const result = await productService.updateStock('1', 30, 'subtract');

            expect(result.newStock).toBe(70);
        });

        test('should reject invalid operation', async () => {
            await expect(
                productService.updateStock('1', 10, 'invalid')
            ).rejects.toThrow('Operation must be: add, subtract, or set');
        });
    });

    describe('getCategories', () => {

        test('should return all categories', async () => {
            const mockCategories = [{ id: '1', name: 'Electronics' }];
            categoryModel.findAll.mockResolvedValue(mockCategories);

            const result = await productService.getCategories();

            expect(result.categories).toHaveLength(1);
        });

        test('should return cached categories', async () => {
            const cached = [{ id: '2', name: 'Clothing' }];
            redis.get.mockResolvedValue(JSON.stringify(cached));

            const result = await productService.getCategories();

            expect(result.categories[0].name).toBe('Clothing');
            expect(categoryModel.findAll).not.toHaveBeenCalled();
        });
    });
});