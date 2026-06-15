/**
 * USER MODEL
 * 
 * Purpose: ALL database operations for the users table
 * 
 * This file is the ONLY place that writes SQL queries for users.
 * If we ever change from PostgreSQL to MySQL/MongoDB,
 * we ONLY change this file. Nothing else breaks.
 * 
 * Rule: No business logic here! Just database queries.
 * Business logic goes in services.
 */

const db = require('../config/database');

class UserModel {

    /**
     * FIND USER BY EMAIL
     * 
     * Used for: Login, checking if email exists during registration
     * 
     * Why this is the most used function:
     * - Every login calls this
     * - Every registration checks this first
     * 
     * Returns: User object with ALL fields (including password_hash)
     * We need password_hash to compare with user's input
     */
    async findByEmail(email) {
        const query = `
      SELECT * 
      FROM users 
      WHERE email = $1 
        AND is_active = true
    `;

        const result = await db.query(query, [email]);

        // Returns undefined if no user found (not an error)
        return result.rows[0];
    }


    /**
     * FIND USER BY USERNAME
     * 
     * Used for: Checking if username is taken during registration
     * 
     * We don't need password_hash here because we're just checking existence
     */
    async findByUsername(username) {
        const query = `
      SELECT id, username 
      FROM users 
      WHERE username = $1
    `;

        const result = await db.query(query, [username]);
        return result.rows[0];
    }

    /**
     * FIND USER BY ID
     * 
     * Used for: Profile lookups, after JWT verification
     * 
     * IMPORTANT: Does NOT return password_hash!
     * Never expose password hash in responses
     * 
     * This is called by auth middleware after verifying JWT
     * to get fresh user data from database
     */
    async findById(id) {
        const query = `
      SELECT 
        id, 
        email, 
        username, 
        full_name, 
        avatar_url, 
        user_role, 
        is_active, 
        email_verified, 
        google_id,
        last_login,
        created_at, 
        updated_at
      FROM users 
      WHERE id = $1
    `;

        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    /**
     * FIND USER BY GOOGLE ID
     * 
     * Used for: Google OAuth login
     * Checks if user already registered with Google
     */
    async findByGoogleId(googleId) {
        const query = `
      SELECT * 
      FROM users 
      WHERE google_id = $1
    `;

        const result = await db.query(query, [googleId]);
        return result.rows[0];
    }

    /**
     * CREATE NEW USER
     * 
     * Used for: Registration, Google OAuth first login
     * 
     * What happens:
     * 1. Insert user data into database
     * 2. PostgreSQL automatically:
     *    - Generates UUID (id)
     *    - Sets created_at to NOW()
     *    - Sets updated_at to NOW()
     * 3. Returns the new user (without password_hash)
     * 
     * For Google users: password_hash is NULL, email_verified is TRUE
     * For email users: password_hash is set, email_verified is FALSE
     */
    async create(userData) {
        const { email, password_hash, username, full_name, google_id, avatar_url } = userData;

        const query = `
      INSERT INTO users (
        email, 
        password_hash, 
        username, 
        full_name, 
        google_id, 
        avatar_url,
        email_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id, 
        email, 
        username, 
        full_name, 
        avatar_url, 
        user_role, 
        is_active, 
        email_verified, 
        google_id,
        created_at
    `;

        const result = await db.query(query, [
            email,
            password_hash || null,        // NULL for Google users
            username,
            full_name || null,
            google_id || null,            // NULL for email users
            avatar_url || null,
            google_id ? true : false      // Google users are auto-verified
        ]);

        return result.rows[0];
    }

    /**
     * UPDATE REFRESH TOKEN
     * 
     * Used for: Saving refresh token after login/token refresh
     * 
     * Why store refresh token in database?
     * - Can revoke tokens (set to NULL)
     * - Can track active sessions
     * - Can invalidate all sessions for a user
     * 
     * The 7-day expiry is also set here as backup
     * (JWT also has its own expiry, this is double protection)
     */
    async updateRefreshToken(userId, refreshToken) {
        const query = `
      UPDATE users 
      SET 
        refresh_token = $2, 
        refresh_token_expires = NOW() + INTERVAL '7 days',
        updated_at = NOW()
      WHERE id = $1
    `;

        await db.query(query, [userId, refreshToken]);
    }

    /**
     * REMOVE REFRESH TOKEN (LOGOUT)
     * 
     * Used for: Logout
     * Sets refresh_token to NULL so old tokens can't be used
     */
    async removeRefreshToken(userId) {
        const query = `
      UPDATE users 
      SET 
        refresh_token = NULL, 
        refresh_token_expires = NULL,
        updated_at = NOW()
      WHERE id = $1
    `;

        await db.query(query, [userId]);
    }

    /**
     * UPDATE LAST LOGIN
     * 
     * Used for: Tracking when user last logged in
     * Also resets login_attempts on successful login
     * 
     * This is called AFTER successful password verification
     */
    async updateLastLogin(userId) {
        const query = `
      UPDATE users 
      SET 
        last_login = NOW(), 
        login_attempts = 0,
        updated_at = NOW()
      WHERE id = $1
    `;

        await db.query(query, [userId]);
    }

    /**
     * INCREMENT LOGIN ATTEMPTS
     * 
     * Used for: Brute force protection
     * 
     * What happens:
     * - Every failed login = +1 to login_attempts
     * - After 5 failed attempts = lock account for 30 minutes
     * - This prevents hackers from trying thousands of passwords
     */
    async incrementLoginAttempts(userId) {
        const query = `
      UPDATE users 
      SET 
        login_attempts = login_attempts + 1,
        locked_until = CASE 
          WHEN login_attempts >= 4 THEN NOW() + INTERVAL '30 minutes'
          ELSE locked_until
        END,
        updated_at = NOW()
      WHERE id = $1
    `;

        await db.query(query, [userId]);
    }

    /**
     * CHECK IF USER EXISTS
     * 
     * Quick check without returning all data
     * Used for validation
     */
    async exists(id) {
        const query = `
      SELECT 1 
      FROM users 
      WHERE id = $1 
        AND is_active = true
    `;

        const result = await db.query(query, [id]);
        return result.rows.length > 0;
    }

    /**
     * SOFT DELETE USER
     * 
     * We NEVER actually delete users (data retention laws)
     * Instead, we deactivate them (soft delete)
     */
    async deactivate(id) {
        const query = `
      UPDATE users 
      SET 
        is_active = false,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, email
    `;

        const result = await db.query(query, [id]);
        return result.rows[0];
    }
}

// Export a single instance
module.exports = new UserModel();