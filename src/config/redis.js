const Redis = require('ioredis');

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_HOST?.includes('upstash') ? {} : undefined,
    retryStrategy: (times) => {
        // Don't retry in test environment
        if (process.env.NODE_ENV === 'test') {
            return null; // Stop trying immediately
        }
        if (times > 3) {
            console.error(' Redis connection failed after 3 retries');
            return null;
        }
        return Math.min(times * 200, 2000);
    },
    maxRetriesPerRequest: 0, // Don't retry in tests
    lazyConnect: true, // Don't connect until first command
});

redis.on('connect', () => {
    if (process.env.NODE_ENV !== 'test') {
        console.log('Redis connected');
    }
});

redis.on('error', (err) => {
    if (process.env.NODE_ENV !== 'test') {
        console.error('Redis error:', err.message);
    }
});

module.exports = redis;