// Load environment variables FIRST (before anything else)
require('dotenv').config();

const express = require('express');
const setupSwagger = require('./config/swagger');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Import our custom modules
const { errorHandler } = require('./middleware/error.middleware');
const ResponseHandler = require('./utils/response');

// Import routes
const routes = require('./routes/v1');

// Create Express application
const app = express();
const PORT = process.env.PORT || 3000;

// ──────────────────────────────────────
// 1. SECURITY MIDDLEWARE
// ──────────────────────────────────────

// Helmet sets various HTTP headers for security
// Protects against XSS, clickjacking, etc.
app.use(helmet());

// CORS - Controls which websites can access your API
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',  // In production, change * to your domain
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting - Prevents abuse (100 requests per 15 minutes per IP)
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Max 100 requests
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests, please try again later.'
    }
});

// Apply rate limiting to ALL /api/ routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,  // Only 10 login attempts per 15 minutes
    message: { success: false, message: 'Too many attempts' }
});

// Generous limiter for product browsing
const productLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,  // 1 minute
    max: 100,  // 100 requests per minute
    message: { success: false, message: 'Too many requests' }
});

// Apply different limits
app.use('/api/v1/auth/login', authLimiter);     // Strict for login
app.use('/api/v1/auth/register', authLimiter);  // Strict for register
app.use('/api/v1/products', productLimiter);     // Generous for browsing

// ──────────────────────────────────────
// 2. UTILITY MIDDLEWARE
// ──────────────────────────────────────

// Compression - Makes responses smaller (faster for users)
app.use(compression());

// Logging - Shows requests in console (dev mode = simple, production = detailed)
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));  // Colored, simple logs
} else {
    app.use(morgan('combined'));  // Detailed logs for analysis
}

// Body Parsing - Allows reading JSON from request body
app.use(express.json({ limit: '10mb' }));  // Limit body size to 10MB

// URL Encoded - Allows reading form data
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// swagger config 
setupSwagger(app);

// ──────────────────────────────────────
// 3. STATIC FILES (if needed)
// ──────────────────────────────────────
// app.use('/uploads', express.static('uploads'));

// ──────────────────────────────────────
// 4. ROUTES
// ──────────────────────────────────────

// Health Check - Used by monitoring tools to check if server is alive
app.get('/health', async (req, res) => {
    const db = require('./config/database');
    const dbHealthy = await db.healthCheck();

    const healthStatus = {
        success: dbHealthy,
        message: dbHealthy ? 'Server is healthy' : 'Database connection failed',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),  // How long server has been running
        database: dbHealthy ? 'connected' : 'disconnected',
        memory: process.memoryUsage().heapUsed / 1024 / 1024  // Memory in MB
    };

    res.status(dbHealthy ? 200 : 503).json(healthStatus);
});

// Welcome Route
app.get('/', (req, res) => {
    ResponseHandler.success(res, {
        name: 'E-Commerce API',
        version: '1.0.0',
        documentation: '/api-docs',
        health: '/health',
        endpoints: {
            auth: '/api/v1/auth',
            // Add more as you build them
        }
    }, 'Welcome to E-Commerce API');
});

// Mount API routes
app.use('/api/v1', routes);

// ──────────────────────────────────────
// 5. 404 HANDLER
// ──────────────────────────────────────
// If no route matched, send 404
app.use((req, res) => {
    ResponseHandler.notFound(res, `Route ${req.originalUrl} not found`);
});

// ──────────────────────────────────────
// 6. GLOBAL ERROR HANDLER
// ──────────────────────────────────────
// Must be LAST - catches all errors from all routes
app.use(errorHandler);

// ──────────────────────────────────────
// 7. START SERVER
// ──────────────────────────────────────

app.listen(PORT, () => {
    console.log('╔══════════════════════════════════════╗');
    console.log('║   🚀 E-COMMERCE API SERVER          ║');
    console.log('╠══════════════════════════════════════╣');
    console.log(`║ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`║ Port: http://localhost:${PORT}`);
    console.log(`║ API: http://localhost:${PORT}/api/v1`);
    console.log(`║ Health: http://localhost:${PORT}/health`);
    console.log('╚══════════════════════════════════════╝');
});

// ──────────────────────────────────────
// 8. GRACEFUL SHUTDOWN
// ──────────────────────────────────────
// Closes database connections when server stops
// Prevents "connection lost" errors

const shutdown = async (signal) => {
    console.log(`\n⚠️  ${signal} received. Shutting down gracefully...`);

    try {
        const db = require('./config/database');
        await db.pool?.end();
        console.log('✅ Database connections closed');
    } catch (error) {
        console.error('Error closing database:', error.message);
    }

    process.exit(0);
};

// Listen for shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Export for testing
module.exports = app;