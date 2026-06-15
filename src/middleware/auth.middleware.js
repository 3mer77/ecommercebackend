/**
 * AUTH MIDDLEWARE
 * 
 * Purpose: Protect routes - only allow authenticated users
 * 
 * This runs BEFORE controllers on protected routes
 */

const jwtService = require('../utils/jwt');
const userModel = require('../models/user.model');
const ResponseHandler = require('../utils/response');

const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return ResponseHandler.unauthorized(res, 'Access token required');
        }

        // Extract token (remove "Bearer " prefix)
        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwtService.verifyAccessToken(token);

        // Get fresh user data from database
        const user = await userModel.findById(decoded.userId);

        if (!user) {
            return ResponseHandler.unauthorized(res, 'User not found');
        }

        if (!user.is_active) {
            return ResponseHandler.forbidden(res, 'Account has been deactivated');
        }

        // Attach user to request object
        req.user = user;

        // Continue to controller
        next();

    } catch (error) {
        return ResponseHandler.unauthorized(res, error.message);
    }
};

module.exports = { authenticate };