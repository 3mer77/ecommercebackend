/**
 * AUTH CONTROLLER
 * 
 * Purpose: Handle HTTP requests and responses for authentication
 * 
 * This file is the MIDDLEMAN:
 * - Receives HTTP request
 * - Calls the service (business logic)
 * - Returns HTTP response
 * 
 * It does NO business logic itself
 * It does NO database queries itself
 */

const authService = require('../services/auth.service');
const ResponseHandler = require('../utils/response');
const emailVerificationService = require('../services/emailVerification.service');

class AuthController {

    /**
     * REGISTER
     * POST /api/v1/auth/register
     */
    async register(req, res, next) {
        try {
            // req.body is already validated by the validator middleware
            const result = await authService.register(req.body);

            // Return 201 (Created) with user data and tokens
            return ResponseHandler.created(res, result, 'Registration successful');

        } catch (error) {
            // Pass to error handler middleware
            next(error);
        }
    }

    /**
     * LOGIN
     * POST /api/v1/auth/login
     */
    async login(req, res, next) {
        try {
            const result = await authService.login(req.body);

            return ResponseHandler.success(res, result, 'Login successful');

        } catch (error) {
            next(error);
        }
    }

    /**
     * REFRESH TOKEN
     * POST /api/v1/auth/refresh-token
     */
    async refreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;
            const result = await authService.refreshAccessToken(refreshToken);

            return ResponseHandler.success(res, result, 'Token refreshed successfully');

        } catch (error) {
            next(error);
        }
    }

    /**
     * LOGOUT
     * POST /api/v1/auth/logout
     * Protected route - user must be logged in
     */
    async logout(req, res, next) {
        try {
            // req.user comes from auth middleware
            const result = await authService.logout(req.user.id);

            return ResponseHandler.success(res, result, 'Logged out successfully');

        } catch (error) {
            next(error);
        }
    }

    /**
     * GET PROFILE
     * GET /api/v1/auth/profile
     * Protected route - returns current user's data
     */
    async getProfile(req, res, next) {
        try {
            // req.user is set by auth middleware
            return ResponseHandler.success(res, { user: req.user }, 'Profile retrieved');

        } catch (error) {
            next(error);
        }
    }

    /**
     * GOOGLE OAUTH
     * GET /api/v1/auth/google
     * Redirects to Google login page
     */
    async googleAuth(req, res, next) {
        try {
            const authUrl = await authService.getGoogleAuthURL();
            res.redirect(authUrl);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GOOGLE OAUTH CALLBACK
     * GET /api/v1/auth/google/callback
     * Handles the redirect from Google
     */
    async googleCallback(req, res, next) {
        try {
            const { code } = req.query;

            if (!code) {
                return ResponseHandler.badRequest(res, 'Authorization code is required');
            }

            const result = await authService.handleGoogleCallback(code);

            // Redirect to frontend with tokens
            // Or return JSON for API clients
            return ResponseHandler.success(res, result, 'Google authentication successful');

        } catch (error) {
            next(error);
        }
    }

    async sendVerificationOtp(req, res, next) {
        try {
            const result = await emailVerificationService.sendVerificationOtp(
                req.user.id,
                req.user.email
            );
            return ResponseHandler.success(res, result, 'OTP sent');
        } catch (error) {
            next(error);
        }
    }

    async verifyEmailOtp(req, res, next) {
        try {
            const { otp } = req.body;
            const result = await emailVerificationService.verifyEmailOtp(req.user.id, otp);
            return ResponseHandler.success(res, result, 'Email verified');
        } catch (error) {
            next(error);
        }
    }

    async resendOtp(req, res, next) {
        try {
            const result = await emailVerificationService.resendOtp(req.user.id, req.user.email);
            return ResponseHandler.success(res, result, 'OTP resent');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AuthController();