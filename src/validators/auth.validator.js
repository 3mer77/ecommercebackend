/**
 * AUTH VALIDATOR
 * 
 * Purpose: Validate user input BEFORE it reaches the controller
 * 
 * Why validate here and not in the service?
 * - Separation of concerns (service handles logic, validator handles input)
 * - Returns clear error messages to the user
 * - Prevents bad data from ever reaching your business logic
 * - Can reuse validators in multiple routes
 */

const { body, validationResult } = require('express-validator');

/**
 * REGISTER VALIDATION RULES
 * 
 * What we check:
 * - Email: format, not empty
 * - Password: minimum length, complexity (uppercase, lowercase, number, special char)
 * - Username: length, allowed characters
 * - Full name: optional but has limits if provided
 */
const registerValidation = [
    // Email validation
    body('email')
        .trim()                           // Remove whitespace
        .notEmpty()                       // Must not be empty
        .withMessage('Email is required')
        .isEmail()                        // Must be valid email format
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),                // Convert to lowercase, remove dots from gmail, etc.

    // Password validation
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .isLength({ max: 128 })
        .withMessage('Password must be less than 128 characters')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/)
        .withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/)
        .withMessage('Password must contain at least one number')
        .matches(/[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/]/)
        .withMessage('Password must contain at least one special character'),

    // Username validation
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required')
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores')
        .toLowerCase(),                  // Store usernames in lowercase

    // Full name validation (optional field)
    body('full_name')
        .optional()                      // Not required
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('Full name can only contain letters, spaces, hyphens, and apostrophes'),
];

/**
 * LOGIN VALIDATION RULES
 * 
 * Simpler than register:
 * - Email: must exist and be valid format
 * - Password: must not be empty (we don't check complexity on login)
 *   Why? Because the user already set their password during registration
 *   We just need to compare it, not validate its format
 */
const loginValidation = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),

    body('password')
        .notEmpty()
        .withMessage('Password is required'),
];

/**
 * REFRESH TOKEN VALIDATION
 */
const refreshTokenValidation = [
    body('refreshToken')
        .notEmpty()
        .withMessage('Refresh token is required')
        .isString()
        .withMessage('Refresh token must be a string'),
];

/**
 * VALIDATION RESULT CHECKER
 * 
 * This middleware runs AFTER the validation rules
 * Checks if any validation failed and returns errors
 * 
 * If no errors → calls next() to continue to controller
 * If errors → returns 400 with error details
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        // Format errors nicely
        const formattedErrors = errors.array().map(error => ({
            field: error.path,           // Which field has the error (email, password, etc.)
            message: error.msg,          // Our custom error message
            value: error.value           // What the user actually sent (for debugging)
        }));

        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: formattedErrors,
            timestamp: new Date().toISOString()
        });
    }

    // All good! Continue to controller
    next();
};

module.exports = {
    registerValidation,
    loginValidation,
    refreshTokenValidation,
    validate
};