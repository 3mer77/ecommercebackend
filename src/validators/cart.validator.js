// src/validators/cart.validator.js
const { body, validationResult } = require('express-validator');

const addToCartValidation = [
    body('productId')
        .notEmpty().withMessage('Product ID is required')
        .isUUID().withMessage('Invalid product ID'),

    body('quantity')
        .optional()
        .isInt({ min: 1, max: 99 }).withMessage('Quantity must be between 1 and 99')
];

const updateQuantityValidation = [
    body('quantity')
        .notEmpty().withMessage('Quantity is required')
        .isInt({ min: 1, max: 99 }).withMessage('Quantity must be between 1 and 99')
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

module.exports = { addToCartValidation, updateQuantityValidation, validate };