// src/controllers/order.controller.js
const orderService = require('../services/order.service');
const ResponseHandler = require('../utils/response');

class OrderController {

    async create(req, res, next) {
        try {
            const { shippingAddress } = req.body;
            const order = await orderService.createOrder(req.user.id, shippingAddress);
            return ResponseHandler.created(res, order, 'Order created successfully');
        } catch (error) {
            next(error);
        }
    }

    async getMyOrders(req, res, next) {
        try {
            const { page, limit } = req.query;
            const result = await orderService.getMyOrders(req.user.id, { page, limit });
            return ResponseHandler.success(res, result, 'Orders retrieved');
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const order = await orderService.findById(req.params.id, req.user.id);
            return ResponseHandler.success(res, { order }, 'Order retrieved');
        } catch (error) {
            next(error);
        }
    }

    async updateStatus(req, res, next) {
        try {
            const { status } = req.body;
            const order = await orderService.updateStatus(req.params.id, status);
            return ResponseHandler.success(res, { order }, 'Order status updated');
        } catch (error) {
            next(error);
        }
    }

    async getAllOrders(req, res, next) {
        try {
            const { page, limit, status } = req.query;
            const result = await orderService.getAllOrders({ page, limit, status });
            return ResponseHandler.success(res, result, 'Orders retrieved');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new OrderController();