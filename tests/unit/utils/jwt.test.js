// tests/unit/utils/jwt.test.js

// We need to set env variables BEFORE importing JWT
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRE = '15m';
process.env.JWT_REFRESH_EXPIRE = '7d';

const jwtService = require('../../../src/utils/jwt');

describe('JWT Service', () => {

    // Fake user object
    const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        user_role: 'user'
    };

    test('should generate access token', () => {
        const token = jwtService.generateAccessToken(mockUser);

        // Token should be a string
        expect(typeof token).toBe('string');

        // Token should have 3 parts separated by dots
        const parts = token.split('.');
        expect(parts.length).toBe(3);
    });

    test('should generate refresh token', () => {
        const token = jwtService.generateRefreshToken(mockUser);

        expect(typeof token).toBe('string');
        expect(token.split('.').length).toBe(3);
    });

    test('should verify valid access token', () => { // --

        const token = jwtService.generateAccessToken(mockUser);
        const decoded = jwtService.verifyAccessToken(token);

        console.log("Decoded Value => " + decoded);

        expect(decoded.userId).toBe(mockUser.id);
        expect(decoded.email).toBe(mockUser.email);
        expect(decoded.role).toBe(mockUser.user_role);
    });

    test('should verify valid refresh token', () => {
        const token = jwtService.generateRefreshToken(mockUser);
        const decoded = jwtService.verifyRefreshToken(token);

        expect(decoded.userId).toBe(mockUser.id);
    });

    test('should reject invalid token', () => {
        expect(() => {
            jwtService.verifyAccessToken('invalid-token');
        }).toThrow();
    });

    test('should reject token signed with wrong secret', () => {
        // Create token with different secret
        const jwt = require('jsonwebtoken');
        const fakeToken = jwt.sign({ userId: '123' }, 'wrong-secret');

        expect(() => {
            jwtService.verifyAccessToken(fakeToken);
        }).toThrow();
    });

    test('should decode token without verification', () => {
        const token = jwtService.generateAccessToken(mockUser);
        const decoded = jwtService.decodeToken(token);

        expect(decoded.userId).toBe(mockUser.id);
    });
});