// tests/unit/utils/response.test.js

// Import what we're testing
const ResponseHandler = require('../../../src/utils/response');

// describe() = groups related tests together
describe('ResponseHandler Utility', () => {

    // Mock Express response object
    // This fakes what Express gives us: res.status().json()
    let mockRes;

    // beforeEach() runs BEFORE each test
    // Creates a fresh mock response for every test
    beforeEach(() => {
        mockRes = {
            // status() returns 'this' so we can chain: res.status(200).json({})
            status: jest.fn().mockReturnThis(),
            // json() just returns whatever we pass to it
            json: jest.fn().mockReturnThis()
        };
    });

    // test() = a single test case
    test('success() should return 200 with correct format', () => {
        const data = { user: { id: 1, name: 'John' } };

        // Call the function we're testing
        ResponseHandler.success(mockRes, data, 'User found');

        // Check if status was called with 200
        expect(mockRes.status).toHaveBeenCalledWith(200);

        // Check if json was called with correct structure
        const response = mockRes.json.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.message).toBe('User found');
        expect(response.data).toEqual(data);
        expect(response.timestamp).toBeDefined();
    });

    test('created() should return 201', () => {
        const data = { id: 1, email: 'test@test.com' };

        ResponseHandler.created(mockRes, data);

        expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    test('error() should return correct status code', () => {
        ResponseHandler.error(mockRes, 'Something wrong', 400);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        const response = mockRes.json.mock.calls[0][0];
        expect(response.success).toBe(false);
    });

    test('notFound() should return 404', () => {
        ResponseHandler.notFound(mockRes, 'User not found');

        expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    test('unauthorized() should return 401', () => {
        ResponseHandler.unauthorized(mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    test('badRequest() should return 400 with errors', () => {
        const errors = [{ field: 'email', message: 'Invalid email' }];

        ResponseHandler.badRequest(mockRes, 'Validation failed', errors);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        const response = mockRes.json.mock.calls[0][0];
        expect(response.errors).toEqual(errors);
    });
});