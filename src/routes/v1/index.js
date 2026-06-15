const express = require('express');
const router = express.Router();
const ResponseHandler = require('../../utils/response');

// IMPORT ROUTES
const authRoutes = require('./auth.routes');
const productRoutes = require('./product.routes');
const cartRoutes = require('./cart.routes');

router.get('/', (req, res) => {
    ResponseHandler.success(res, {
        name: 'E-Commerce Backend API',
        version: '1.0.0',
    }, 'Welcome to E-Commerce API v1');
});

// MOUNT ROUTES
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);

module.exports = router;