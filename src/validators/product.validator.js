// src/validators/product.validator.js
const { body, query, validationResult } = require('express-validator');

const createProductValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Product name is required')
        .isLength({ min: 2, max: 500 }).withMessage('Name must be between 2 and 500 characters'),

    body('price')
        .notEmpty().withMessage('Price is required')
        .isFloat({ min: 0.01 }).withMessage('Price must be greater than zero'),

    body('stock_quantity')
        .optional()
        .isInt({ min: 0 }).withMessage('Stock cannot be negative'),

    body('category_id')
        .optional()
        .isUUID().withMessage('Invalid category ID'),

    body('description')
        .optional()
        .trim()
];

const updateStockValidation = [
    body('quantity')
        .notEmpty().withMessage('Quantity is required')
        .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),

    body('operation')
        .notEmpty().withMessage('Operation is required')
        .isIn(['add', 'subtract', 'set']).withMessage('Operation must be: add, subtract, or set')
];

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

module.exports = {
    createProductValidation,
    updateStockValidation,
    validate
};