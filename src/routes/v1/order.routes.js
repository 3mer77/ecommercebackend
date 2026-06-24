// src/routes/v1/order.routes.js
const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/order.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/role.middleware');

router.use(authenticate);

// User routes
router.post('/', orderController.create);
router.get('/', orderController.getMyOrders);
router.get('/:id', orderController.getById);

// Admin routes
router.patch('/:id/status', authorize('admin'), orderController.updateStatus);
router.get('/admin/all', authorize('admin'), orderController.getAllOrders);

module.exports = router;