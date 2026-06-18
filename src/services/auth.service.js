/**
 * AUTH SERVICE
 * 
 * Purpose: ALL authentication business logic
 * 
 * This is the BRAIN of authentication:
 * - Registration rules
 * - Login rules
 * - Token management
 * - Google OAuth logic
 * 
 * This file doesn't know about HTTP, routes, or databases.
 * It just knows BUSINESS RULES.
 */

const bcrypt = require('bcryptjs');
const redis = require('../config/redis');
const axios = require('axios');  // For Google OAuth
const userModel = require('../models/user.model');
const jwtService = require('../utils/jwt');

class AuthService {

    /**
     * REGISTER NEW USER
     * 
     * Steps:
     * 1. Check if email already exists
     * 2. Check if username already exists
     * 3. Hash the password (NEVER store plain text!)
     * 4. Save user to database
     * 5. Generate tokens
     * 6. Save refresh token to database
     * 7. Return user data + tokens
     */
    async register({ email, password, username, full_name }) {
        // Step 1: Check if email exists
        const existingEmail = await userModel.findByEmail(email);
        if (existingEmail) {
            throw Object.assign(new Error('Email already registered'), { statusCode: 409 });
        }

        // Step 2: Check if username exists
        const existingUsername = await userModel.findByUsername(username);
        if (existingUsername) {
            throw Object.assign(new Error('Username already taken'), { statusCode: 409 });
        }

        // Step 3: Hash password
        // Salt rounds = 12 (higher = more secure but slower)
        // 12 is industry standard (takes ~300ms, secure against brute force)
        const salt = await bcrypt.genSalt(12);
        const password_hash = await bcrypt.hash(password, salt);

        // Step 4: Create user in database
        const user = await userModel.create({
            email,
            password_hash,
            username: username.toLowerCase(),
            full_name
        });

        // Step 5: Generate tokens
        const accessToken = jwtService.generateAccessToken(user);
        const refreshToken = jwtService.generateRefreshToken(user);

        // Step 6: Save refresh token to database
        await userModel.updateRefreshToken(user.id, refreshToken);

        // Step 7: Return (NEVER return password_hash!)
        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                full_name: user.full_name,
                role: user.user_role,
                created_at: user.created_at
            },
            accessToken,
            refreshToken
        };
    }

    /**
     * LOGIN USER
     * 
     * Steps:
     * 1. Find user by email
     * 2. Check if account is locked (brute force protection)
     * 3. Check if account has password (Google users don't)
     * 4. Compare password with hash
     * 5. Update last login
     * 6. Generate new tokens
     * 7. Return user data + tokens
     */
    async login({ email, password }) {
        // NO CACHE FOR LOGIN - Security first!
        console.log('🐌 Login from DATABASE:', email);

        const user = await userModel.findByEmail(email);
        if (!user) {
            throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
        }

        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
            throw Object.assign(
                new Error(`Account is locked. Please try again in ${minutesLeft} minutes.`),
                { statusCode: 423 }
            );
        }

        if (!user.password_hash) {
            throw Object.assign(
                new Error('This account uses Google Sign-In. Please login with Google.'),
                { statusCode: 400 }
            );
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            await userModel.incrementLoginAttempts(user.id);
            throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
        }

        await userModel.updateLastLogin(user.id);

        const accessToken = jwtService.generateAccessToken(user);
        const refreshToken = jwtService.generateRefreshToken(user);
        await userModel.updateRefreshToken(user.id, refreshToken);

        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                full_name: user.full_name,
                avatar_url: user.avatar_url,
                user_role: user.user_role
            },
            accessToken,
            refreshToken
        };
    }

    /**
     * REFRESH ACCESS TOKEN
     * 
     * When access token expires (15 min), user sends refresh token
     * to get a new access token without logging in again
     */
    async refreshAccessToken(refreshToken) {
        try {
            const decoded = jwtService.verifyRefreshToken(refreshToken);
            const user = await userModel.findById(decoded.userId);

            if (!user) {
                throw Object.assign(new Error('User not found'), { statusCode: 401 });
            }

            const newAccessToken = jwtService.generateAccessToken(user);
            const newRefreshToken = jwtService.generateRefreshToken(user);
            await userModel.updateRefreshToken(user.id, newRefreshToken);

            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            };
        } catch (error) {
            // ADD THIS: Ensure it always throws with 401 status
            throw Object.assign(
                new Error(error.message || 'Invalid refresh token'),
                { statusCode: 401 }
            );
        }
    }

    /**
     * LOGOUT USER
     * 
     * Removes refresh token from database
     * Access token will still work until it expires (15 min max)
     */
    async logout(userId) {
        await userModel.removeRefreshToken(userId);
        return { message: 'Logged out successfully' };
    }

    /**
     * GOOGLE OAUTH - Generate Google Login URL
     */
    async getGoogleAuthURL() {
        const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';

        const options = {
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
            client_id: process.env.GOOGLE_CLIENT_ID,
            access_type: 'offline',
            response_type: 'code',
            prompt: 'consent',
            scope: [
                'https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/userinfo.email',
            ].join(' '),
        };

        const qs = new URLSearchParams(options);
        return `${rootUrl}?${qs.toString()}`;
    }

    /**
     * GOOGLE OAUTH - Handle callback
     */
    async handleGoogleCallback(code) {
        // Exchange code for tokens
        const { id_token, access_token } = await this.getGoogleTokens(code);

        // Get user info from Google
        const googleUser = await this.getGoogleUserInfo(id_token, access_token);

        // Find or create user
        let user = await userModel.findByGoogleId(googleUser.id);

        if (!user) {
            user = await userModel.findByEmail(googleUser.email);

            if (user) {
                // Link Google to existing account
                const query = `
          UPDATE users 
          SET google_id = $1, email_verified = true 
          WHERE id = $2 
          RETURNING *
        `;
                const db = require('../config/database');
                const result = await db.query(query, [googleUser.id, user.id]);
                user = result.rows[0];
            } else {
                // Create new user
                const username = googleUser.email.split('@')[0] +
                    '_' + Math.random().toString(36).substring(2, 8);

                user = await userModel.create({
                    email: googleUser.email,
                    username: username,
                    full_name: googleUser.name,
                    google_id: googleUser.id,
                    avatar_url: googleUser.picture
                });
            }
        }

        // Generate tokens
        const accessToken = jwtService.generateAccessToken(user);
        const refreshToken = jwtService.generateRefreshToken(user);
        await userModel.updateRefreshToken(user.id, refreshToken);

        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                full_name: user.full_name,
                avatar_url: user.avatar_url,
                role: user.user_role
            },
            accessToken,
            refreshToken
        };
    }

    // Helper: Exchange Google code for tokens
    async getGoogleTokens(code) {
        const response = await axios.post(
            'https://oauth2.googleapis.com/token',
            new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code',
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        return response.data;
    }

    // Helper: Get Google user info
    async getGoogleUserInfo(id_token, access_token) {
        const response = await axios.get(
            'https://www.googleapis.com/oauth2/v1/userinfo',
            {
                params: { alt: 'json', access_token },
                headers: { Authorization: `Bearer ${id_token}` }
            }
        );
        return response.data;
    }
}

module.exports = new AuthService();