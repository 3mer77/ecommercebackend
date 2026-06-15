
const Redis = require('ioredis');

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    retryStrategy: (times) => {
        // Retry connection up to 3 times
        if (times > 3) {
            console.error('❌ Redis connection failed after 3 retries');
            return null; // Stop retrying
        }
        return Math.min(times * 200, 2000); // Wait longer each retry
    },
    maxRetriesPerRequest: 3,
});

redis.on('connect', () => {
    console.log('✅ Redis connected');
});

redis.on('error', (err) => {
    console.error('❌ Redis error:', err.message);
    // Don't crash the app if Redis fails
    // App will still work, just without cache
});

module.exports = redis;