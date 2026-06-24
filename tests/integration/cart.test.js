// tests/integration/cart.test.js
const request = require('supertest');
const BASE_URL = 'http://localhost:3000/api/v1';

describe('Cart API Integration Tests', () => {

    let accessToken;
    let productId;
    let cartItemId;

    beforeAll(async () => {
        // Register and login
        const timestamp = Date.now();
        const res = await request(BASE_URL)
            .post('/auth/register')
            .send({
                email: `carttest_${timestamp}@test.com`,
                password: 'Test123!@#',
                username: `cartuser_${timestamp}`,
                full_name: 'Cart Tester'
            });

        accessToken = res.body.data.accessToken;

        // Get a product ID
        const productsRes = await request(BASE_URL).get('/products');
        productId = productsRes.body.data.products[0].id;
    });

    test('GET /cart - should return empty cart', async () => {
        const res = await request(BASE_URL)
            .get('/cart')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        expect(res.body.success).toBe(true);
    });

    test('POST /cart/items - should add item to cart', async () => {
        const res = await request(BASE_URL)
            .post('/cart/items')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ productId, quantity: 2 })
            .expect(200);

        expect(res.body.success).toBe(true);
        cartItemId = res.body.data.cart.items[0].id;
    });

    test('GET /cart - should show items in cart', async () => {
        const res = await request(BASE_URL)
            .get('/cart')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        expect(res.body.data.cart.items.length).toBeGreaterThan(0);
    });

    test('POST /cart/items - should increase quantity for same product', async () => {
        const res = await request(BASE_URL)
            .post('/cart/items')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ productId, quantity: 3 })
            .expect(200);

        const item = res.body.data.cart.items.find(i => i.product_id === productId);
        expect(item.quantity).toBe(5); // 2 + 3
    });

    test('PUT /cart/items/:id - should update quantity', async () => {
        const res = await request(BASE_URL)
            .put(`/cart/items/${cartItemId}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ quantity: 1 })
            .expect(200);

        expect(res.body.success).toBe(true);
    });

    test('DELETE /cart/items/:id - should remove item', async () => {
        const res = await request(BASE_URL)
            .delete(`/cart/items/${cartItemId}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        expect(res.body.success).toBe(true);
    });

    test('DELETE /cart - should clear cart', async () => {
        // Add item first
        await request(BASE_URL)
            .post('/cart/items')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ productId, quantity: 1 });

        const res = await request(BASE_URL)
            .delete('/cart')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        expect(res.body.success).toBe(true);
    });

    test('POST /cart/items - should reject without token', async () => {
        await request(BASE_URL)
            .post('/cart/items')
            .send({ productId, quantity: 1 })
            .expect(401);
    });
});