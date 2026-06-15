// src/middleware/role.middleware.js
const ResponseHandler = require('../utils/response');

const authorize = (...roles) => {
    return (req, res, next) => {
        // req.user is set by auth middleware
        if (!req.user) {
            return ResponseHandler.unauthorized(res, 'Authentication required');
        }

        if (!roles.includes(req.user.user_role)) {
            return ResponseHandler.forbidden(res, 'You do not have permission to perform this action');
        }

        next();
    };
};

module.exports = { authorize };