const ResponseHandler = require('../utils/response');

/**
 * CUSTOM ERROR CLASS
 * 
 * Purpose: Create errors with specific status codes
 * Instead of: throw new Error('User not found') // Always status 500
 * We use: throw new AppError('User not found', 404) // Status 404
 */
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true; // Marks as "expected error" vs "bug"

        // Captures where the error happened (for debugging)
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * GLOBAL ERROR HANDLER MIDDLEWARE
 * 
 * Express knows this is error handler because it has 4 parameters
 * This runs AUTOMATICALLY when any controller calls next(error)
 */
const errorHandler = (err, req, res, next) => {

    // Log the full error for developers to debug
    console.error('ERROR:', {
        message: err.message,
        statusCode: err.statusCode,
        stack: err.stack,           // Shows where error happened
        url: req.originalUrl,       // Which URL caused it
        method: req.method,         // GET, POST, etc.
        body: req.body,             // What data was sent
        user: req.user?.id          // Which user (if logged in)
    });


    // If error has a statusCode property, use it!
    if (err.statusCode) {
        return ResponseHandler.error(res, err.message, err.statusCode);
    }

    // ──────────────────────────────────────
    // DATABASE ERRORS (PostgreSQL specific)
    // ──────────────────────────────────────

    // Error code 23505 = Duplicate entry (email already exists, etc.)
    if (err.code === '23505') {
        // Extract which field was duplicate from error message
        // PostgreSQL says: "Key (email)=(test@test.com) already exists"
        const field = err.detail?.match(/\(([^)]+)\)/)?.[1] || 'Field';
        return ResponseHandler.conflict(res, `${field} already exists`);
    }

    // Error code 23503 = Foreign key violation (referencing non-existent record)
    if (err.code === '23503') {
        return ResponseHandler.badRequest(res, 'Referenced record does not exist');
    }

    // Error code 23502 = Not null violation (required field missing)
    if (err.code === '23502') {
        const field = err.column || 'Field';
        return ResponseHandler.badRequest(res, `${field} is required`);
    }

    // ──────────────────────────────────────
    // JWT TOKEN ERRORS
    // ──────────────────────────────────────

    // Token is modified, fake, or malformed
    if (err.name === 'JsonWebTokenError') {
        return ResponseHandler.unauthorized(res, 'Invalid token. Please login again.');
    }

    // Token was valid but is now expired
    if (err.name === 'TokenExpiredError') {
        return ResponseHandler.unauthorized(res, 'Token expired. Please login again.');
    }

    // Someone tried to use access token as refresh token or vice versa
    if (err.name === 'NotBeforeError') {
        return ResponseHandler.unauthorized(res, 'Token not yet active');
    }

    // ──────────────────────────────────────
    // VALIDATION ERRORS (from express-validator)
    // ──────────────────────────────────────

    // If validation errors are stored as array
    if (err.errors && Array.isArray(err.errors)) {
        return ResponseHandler.badRequest(res, 'Validation failed', err.errors);
    }

    // ──────────────────────────────────────
    // OUR CUSTOM APP ERRORS
    // ──────────────────────────────────────

    // If we threw this error with AppError class
    if (err.isOperational) {
        return ResponseHandler.error(res, err.message, err.statusCode);
    }

    // ──────────────────────────────────────
    // UNKNOWN / PROGRAMMING ERRORS
    // ──────────────────────────────────────

    // In development: Send full error (for debugging)
    if (process.env.NODE_ENV === 'development') {
        return ResponseHandler.error(res, err.message, 500, [{
            message: err.message,
            stack: err.stack
        }]);
    }

    // In production: Send generic message (don't leak internals)
    return ResponseHandler.serverError(res, 'Something went wrong. Please try again later.');
};

module.exports = { errorHandler, AppError };