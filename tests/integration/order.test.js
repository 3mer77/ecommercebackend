// tests/integration/order.test.js
const request = require('supertest');
const BASE_URL = 'http://localhost:3000/api/v1';

describe('Order API Integration Tests', () => {

    let userToken;
    let adminToken;
    let productId;
    let orderId;

    beforeAll(async () => {
        // Register and login normal user
        const timestamp = Date.now();
        const userRes = await request(BASE_URL)
            .post('/auth/register')
            .send({
                email: `ordertest_${timestamp}@test.com`,
                password: 'Test123!@#',
                username: `orderuser_${timestamp}`,
                full_name: 'Order Tester'
            });
        userToken = userRes.body.data.accessToken;

        // Login as admin (register separately or use existing)
        const adminRes = await request(BASE_URL)
            .post('/auth/login')
            .send({
                email: 'admin@test.com',
                password: 'Test123!@#'
            });
        adminToken = adminRes.body.data.accessToken;

        // Get a product ID
        const productsRes = await request(BASE_URL).get('/products');
        productId = productsRes.body.data.products[0].id;
    });

    describe('Order Creation', () => {

        test('POST /orders - should create order from cart', async () => {
            // Add item to cart first
            await request(BASE_URL)
                .post('/cart/items')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ productId, quantity: 2 });

            // Create order
            const res = await request(BASE_URL)
                .post('/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    shippingAddress: {
                        street: '123 Test Street',
                        city: 'Riyadh',
                        country: 'Saudi Arabia'
                    }
                })
                .expect(201);

            expect(res.body.success).toBe(true);
            expect(res.body.data.order_number).toBeDefined();
            expect(res.body.data.status).toBe('pending');
            orderId = res.body.data.id;
        });

        test('POST /orders - should fail with empty cart', async () => {
            const res = await request(BASE_URL)
                .post('/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ shippingAddress: { city: 'Riyadh' } })
                .expect(400);

            expect(res.body.success).toBe(false);
        });

        test('POST /orders - should fail without token', async () => {
            await request(BASE_URL)
                .post('/orders')
                .send({ shippingAddress: { city: 'Riyadh' } })
                .expect(401);
        });
    });

    describe('Get Orders', () => {

        test('GET /orders - should return user orders', async () => {
            const res = await request(BASE_URL)
                .get('/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.orders.length).toBeGreaterThan(0);
        });

        test('GET /orders/:id - should return order details', async () => {
            const res = await request(BASE_URL)
                .get(`/orders/${orderId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.order.id).toBe(orderId);
        });

        test('GET /orders/:id - should not return other user order', async () => {
            // Create another user and try to access
            const res = await request(BASE_URL)
                .get(`/orders/${orderId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);
        });
    });

    describe('Admin Order Management', () => {

        test('GET /orders/admin/all - should return all orders', async () => {
            const res = await request(BASE_URL)
                .get('/orders/admin/all')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(res.body.success).toBe(true);
        });

        test('GET /orders/admin/all - normal user should be blocked', async () => {
            await request(BASE_URL)
                .get('/orders/admin/all')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(403);
        });

        test('PATCH /orders/:id/status - admin can update status', async () => {
            const res = await request(BASE_URL)
                .patch(`/orders/${orderId}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'confirmed' })
                .expect(200);

            expect(res.body.data.order.status).toBe('confirmed');
        });

        test('PATCH /orders/:id/status - should reject invalid status', async () => {
            const res = await request(BASE_URL)
                .patch(`/orders/${orderId}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'invalid_status' })
                .expect(400);
        });

        test('PATCH /orders/:id/status - normal user should be blocked', async () => {
            await request(BASE_URL)
                .patch(`/orders/${orderId}/status`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ status: 'shipped' })
                .expect(403);
        });
    });
});