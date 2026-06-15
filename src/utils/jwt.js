const jwt = require('jsonwebtoken');

class JWTService {
    // create a access token ( 15 min )

    generateAccessToken(user) {

        const payload = {
            userId: user.id,
            email: user.email,
            role: user.user_role
        }

        return jwt.sign(
            payload,
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m' }
        )

    }

    generateRefreshToken(user) {
        const payload = {
            userId: user.id
        }

        return jwt.sign(
            payload,
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
        )
    }

    verifyAccessToken(token) {

        try {
            // This does ALL the checking automatically:
            // - Signature validation
            // - Expiration check
            // - Secret key verification

            return jwt.verify(token, process.env.JWT_ACCESS_SECRET);


        } catch (error) {
            // Different errors tell us WHAT went wrong
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token has expired. Please refresh or login again.');
            }
            if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid token. Please login again.');
            }
            throw error;
        }

    }

    verifyRefreshToken(token) {

        try {

            return jwt.verify(token, process.env.JWT_REFRESH_SECRET);

        } catch (err) {

            if (err.name === "TokenExpiredError") {
                throw new Error('Refresh token has expired plaese login again');
            }
            if (err.name === 'JsonWebTokenError') {
                throw new Error('Invalid refresh token. Please login again.');
            }
            throw err;

        }

    }

    /**
   * DECODE TOKEN (Without Verification)
   * 
   * WARNING: Only use for reading public data!
   * Does NOT verify signature - anyone could have made this token
   * 
   * Use case: Getting user ID from token before full verification
   * NOT for security decisions!
   */
    decodeToken(token) {
        return jwt.decode(token);
    }
}

// Export a SINGLE instance (singleton pattern)
// Everyone shares the same JWTService
module.exports = new JWTService();