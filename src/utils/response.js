/**
 * RESPONSE HANDLER UTILITY
 * 
 * Purpose: Standardizes ALL API responses across the entire application.
 * Instead of every controller writing its own response format,
 * we use this ONE class to ensure consistency.
 * 
 * Why this matters:
 * - Frontend developers know exactly what format to expect
 * - Mobile apps get consistent responses
 * - Easier to debug (all errors look the same)
 * - One place to change response format if needed
 */

class ResponseHandler {
  
  /**
   * SUCCESS RESPONSE
   * Use for: 200 OK responses
   * Example: Getting user profile, listing products, updating settings
   * 
   * @param {Object} res - Express response object
   * @param {*} data - The data to send back (object, array, null)
   * @param {String} message - Human readable message
   * @param {Number} statusCode - HTTP status code (default 200)
   * 
   * Response looks like:
   * {
   *   "success": true,
   *   "message": "User found",
   *   "data": { "id": 1, "name": "John" },
   *   "timestamp": "2024-01-15T10:30:00.000Z"
   * }
   */
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message: message,
      data: data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * CREATED RESPONSE
   * Use for: 201 Created responses
   * Example: New user registered, product created, order placed
   * 
   * Same as success() but always uses status 201
   * Why separate? Semantically shows "something was created" vs "request succeeded"
   */
  static created(res, data = null, message = 'Created successfully') {
    return this.success(res, data, message, 201);
  }

  /**
   * PAGINATED RESPONSE
   * Use for: Any endpoint that returns a LIST of items
   * Example: GET /products, GET /users, GET /orders
   * 
   * Adds pagination info so frontend knows:
   * - What page are we on?
   * - How many total items?
   * - Is there more data to load?
   * 
   * Response looks like:
   * {
   *   "success": true,
   *   "message": "Products retrieved",
   *   "data": [ ... array of products ... ],
   *   "pagination": {
   *     "page": 1,
   *     "limit": 20,
   *     "total": 150,
   *     "pages": 8,
   *     "hasNext": true,
   *     "hasPrev": false
   *   }
   * }
   */
  static paginated(res, data, pagination, message = 'Success') {
    return res.status(200).json({
      success: true,
      message: message,
      data: data,
      pagination: pagination,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * ERROR RESPONSE
   * Use for: ALL errors (500, 400, 404, 401, etc.)
   * 
   * The "errors" parameter is for validation errors (array of specific field errors)
   * Example: [{ field: "email", message: "Email is invalid" }]
   */
  static error(res, message = 'Internal Server Error', statusCode = 500, errors = null) {
    const response = {
      success: false,
      message: message,
      timestamp: new Date().toISOString()
    };

    // Only add errors field if there are specific errors to show
    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * 400 BAD REQUEST
   * Use for: Invalid input, missing required fields, validation failures
   * Example: Registering without email, product price negative
   */
  static badRequest(res, message = 'Bad Request', errors = null) {
    return this.error(res, message, 400, errors);
  }

  /**
   * 401 UNAUTHORIZED
   * Use for: Missing or invalid authentication
   * Example: No token provided, expired token, wrong credentials
   */
  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, message, 401);
  }

  /**
   * 403 FORBIDDEN
   * Use for: Valid authentication but insufficient permissions
   * Example: Normal user trying to access admin panel
   * 
   * DIFFERENCE from 401:
   * - 401 = "Who are you?" (not logged in)
   * - 403 = "I know who you are, but you can't do this" (logged in but no permission)
   */
  static forbidden(res, message = 'Forbidden') {
    return this.error(res, message, 403);
  }

  /**
   * 404 NOT FOUND
   * Use for: Resource doesn't exist
   * Example: User ID doesn't exist, product deleted, wrong URL
   */
  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404);
  }

  /**
   * 409 CONFLICT
   * Use for: Duplicate resources
   * Example: Email already registered, username taken, product SKU exists
   */
  static conflict(res, message = 'Resource already exists') {
    return this.error(res, message, 409);
  }

  /**
   * 429 TOO MANY REQUESTS
   * Use for: Rate limiting
   * Example: User sending 1000 requests in 1 minute
   */
  static tooMany(res, message = 'Too many requests') {
    return this.error(res, message, 429);
  }

  /**
   * 500 INTERNAL SERVER ERROR
   * Use for: Unexpected errors, bugs, database failures
   * Example: Database connection lost, null pointer, unhandled exception
   */
  static serverError(res, message = 'Internal Server Error') {
    return this.error(res, message, 500);
  }
}

module.exports = ResponseHandler;