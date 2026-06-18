// tests/integration/auth.test.js

// supertest makes HTTP requests to our app
const request = require('supertest');

// We need to import the app WITHOUT starting the server

const BASE_URL = 'http://localhost:3000/api/v1';

describe('Auth API Integration Tests', () => {

    // Generate unique email for each test run
    const testUser = {
        email: `test_${Date.now()}@test.com`,
        password: 'Test123!@#',
        username: `testuser_${Date.now()}`,
        full_name: 'Test User'
    };

    let accessToken = null;
    let refreshToken = null;

    // TEST 1: Register
    test('POST /auth/register - should register new user', async () => {
        const response = await request(BASE_URL)
            .post('/auth/register')
            .send(testUser)
            .expect(201); // Expect 201 Created

        // Check response structure
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe(testUser.email);
        expect(response.body.data.accessToken).toBeDefined();
        expect(response.body.data.refreshToken).toBeDefined();

        // Save tokens for next tests
        accessToken = response.body.data.accessToken;
        refreshToken = response.body.data.refreshToken;
    });

    // TEST 2: Duplicate Registration (FIXED)
    test('POST /auth/register - should reject duplicate email', async () => {
        // First, create a user
        const uniqueUser = {
            email: `dup_${Date.now()}@test.com`,
            password: 'Test123!@#',
            username: `dupuser_${Date.now()}`,
            full_name: 'Test User'
        };

        // Register first time - should succeed
        await request(BASE_URL)
            .post('/auth/register')
            .send(uniqueUser)
            .expect(201);

        // Register second time - should fail
        const response = await request(BASE_URL)
            .post('/auth/register')
            .send(uniqueUser)
            .expect(409);

        expect(response.body.success).toBe(false);
    });

    // TEST 3: Login
    test('POST /auth/login - should login user', async () => {
        const response = await request(BASE_URL)
            .post('/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            })
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.accessToken).toBeDefined();

        // Update tokens
        accessToken = response.body.data.accessToken;
        refreshToken = response.body.data.refreshToken;
    });

    // TEST 4: Login with wrong password
    test('POST /auth/login - should reject wrong password', async () => {
        const response = await request(BASE_URL)
            .post('/auth/login')
            .send({
                email: testUser.email,
                password: 'WrongPassword123!@#'
            })
            .expect(401);

        expect(response.body.success).toBe(false);
    });

    // TEST 5: Get Profile with valid token
    test('GET /auth/profile - should return user profile', async () => {
        const response = await request(BASE_URL)
            .get('/auth/profile')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe(testUser.email);
    });

    // TEST 6: Get Profile without token
    test('GET /auth/profile - should reject without token', async () => {
        const response = await request(BASE_URL)
            .get('/auth/profile')
            .expect(401);

        expect(response.body.success).toBe(false);
    });

    // TEST 7: Get Profile with invalid token
    test('GET /auth/profile - should reject invalid token', async () => {
        const response = await request(BASE_URL)
            .get('/auth/profile')
            .set('Authorization', 'Bearer invalid_token_here')
            .expect(401);

        expect(response.body.success).toBe(false);
    });

    // TEST 8: Refresh Token
    test('POST /auth/refresh-token - should refresh tokens', async () => {
        const response = await request(BASE_URL)
            .post('/auth/refresh-token')
            .send({ refreshToken })
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.accessToken).toBeDefined();
    });

    // TEST 9: Refresh with invalid token
    test('POST /auth/refresh-token - should reject invalid token', async () => {
        const response = await request(BASE_URL)
            .post('/auth/refresh-token')
            .send({ refreshToken: 'invalid_token' })
            .expect(401);
    });

    // TEST 10: Validation - Missing fields
    test('POST /auth/register - should validate required fields', async () => {
        const response = await request(BASE_URL)
            .post('/auth/register')
            .send({ email: 'bad@test.com' }) // Missing password, username
            .expect(400);

        expect(response.body.success).toBe(false);
    });

    // TEST 11: Validation - Weak password
    test('POST /auth/register - should reject weak password', async () => {
        const response = await request(BASE_URL)
            .post('/auth/register')
            .send({
                email: 'weak@test.com',
                password: 'weak', // Too short, no uppercase, no number, no special
                username: 'weakuser'
            })
            .expect(400);

        expect(response.body.success).toBe(false);
    });
});