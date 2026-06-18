// src/config/swagger.js
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger definition
const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'E-Commerce API',
        version: '1.0.0',
        description: 'Professional E-Commerce REST API with JWT Authentication, Redis Caching, and PostgreSQL',
        contact: {
            name: 'Amer Abdulqeum',
            email: 'alaliamer19@gmail.com',
        },
        license: {
            name: 'MIT',
        },
    },
    servers: [
        {
            url: 'http://localhost:3000/api/v1',
            description: 'Development Server',
        },
        {
            url: 'https://ecommercebackend-mido.onrender.com/api/v1',
            description: 'Production Server',
        },
    ],
    components: {
        securitySchemes: {
            BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Enter your JWT access token',
            },
        },
    },
};

const options = {
    swaggerDefinition,
    apis: ['./src/routes/v1/*.js'],
};

const swaggerSpec = swaggerJsDoc(options);

const setupSwagger = (app) => {
    const CSS = `
    /* Modern Light Theme */
    .swagger-ui {
      background: #f8fafc;
    }
    
    .swagger-ui .topbar {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
      padding: 12px 0;
      box-shadow: 0 2px 15px rgba(99, 102, 241, 0.2);
    }
    
    .swagger-ui .topbar .wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .swagger-ui .topbar a {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: white !important;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .swagger-ui .info .title {
      font-size: 32px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 8px;
    }
    
    .swagger-ui .info {
      margin: 20px 0;
    }
    
    .swagger-ui .info p {
      color: #64748b;
    }
    
    .swagger-ui .scheme-container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 2px 20px rgba(0,0,0,0.06);
      padding: 20px;
      margin-bottom: 25px;
      border: 1px solid #e2e8f0;
    }
    
    .swagger-ui .opblock {
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
      margin-bottom: 12px;
      border: 1px solid #e2e8f0;
      background: white;
      transition: all 0.2s;
    }
    
    .swagger-ui .opblock:hover {
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }
    
    .swagger-ui .opblock .opblock-summary {
      padding: 10px 20px;
      border: none;
    }
    
    .swagger-ui .opblock .opblock-summary-method {
      border-radius: 6px;
      font-weight: 700;
      font-size: 12px;
      min-width: 75px;
      text-align: center;
      padding: 5px 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .swagger-ui .opblock.opblock-get {
      border-left: 4px solid #3b82f6;
    }
    
    .swagger-ui .opblock.opblock-post {
      border-left: 4px solid #10b981;
    }
    
    .swagger-ui .opblock.opblock-put {
      border-left: 4px solid #f59e0b;
    }
    
    .swagger-ui .opblock.opblock-delete {
      border-left: 4px solid #ef4444;
    }
    
    .swagger-ui .opblock.opblock-patch {
      border-left: 4px solid #8b5cf6;
    }
    
    .swagger-ui .opblock .opblock-summary-description {
      color: #64748b;
      font-size: 13px;
    }
    
    .swagger-ui .opblock .opblock-section-header {
      background: #f8fafc;
      border: none;
      border-bottom: 1px solid #e2e8f0;
      padding: 10px 20px;
    }
    
    .swagger-ui .opblock .opblock-section-header h4 {
      color: #1e293b;
      font-weight: 600;
    }
    
    .swagger-ui .opblock-body {
      background: white;
    }
    
    .swagger-ui .opblock-body pre {
      background: #1e293b;
      border-radius: 8px;
      color: #e2e8f0;
      padding: 15px;
    }
    
    .swagger-ui .btn {
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      transition: all 0.3s;
      padding: 8px 16px;
    }
    
    .swagger-ui .btn.execute {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border: none;
      color: white;
    }
    
    .swagger-ui .btn.execute:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }
    
    .swagger-ui .btn.authorize {
      background: white;
      border: 2px solid #6366f1;
      color: #6366f1;
    }
    
    .swagger-ui .btn.authorize:hover {
      background: #6366f1;
      color: white;
    }
    
    .swagger-ui .btn.cancel {
      background: white;
      border: 2px solid #ef4444;
      color: #ef4444;
    }
    
    .swagger-ui select {
      background: white;
      color: #1e293b;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 6px 10px;
    }
    
    .swagger-ui input[type=text] {
      background: white;
      color: #1e293b;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px 12px;
    }
    
    .swagger-ui .model-box {
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    
    .swagger-ui .model {
      color: #1e293b;
    }
    
    .swagger-ui .parameter__name {
      color: #4f46e5;
      font-weight: 600;
    }
    
    .swagger-ui .parameter__type {
      color: #64748b;
    }
    
    .swagger-ui .responses-inner h4, 
    .swagger-ui .responses-inner h5 {
      color: #1e293b;
    }
    
    .swagger-ui .response-col_status {
      color: #1e293b;
      font-weight: 600;
    }
    
    .swagger-ui table thead tr td, 
    .swagger-ui table thead tr th {
      color: #64748b;
      border-bottom: 2px solid #e2e8f0;
      font-weight: 600;
    }
    
    .swagger-ui td {
      border-bottom: 1px solid #f1f5f9;
    }
    
    .swagger-ui .loading-container {
      background: white;
    }
    
    /* Response status colors */
    .swagger-ui .response-col_status .response-undocumented {
      color: #94a3b8;
    }
    
    /* Scrollbar */
    .swagger-ui ::-webkit-scrollbar {
      width: 6px;
    }
    
    .swagger-ui ::-webkit-scrollbar-track {
      background: #f1f5f9;
    }
    
    .swagger-ui ::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
    }
    
    /* Tag section */
    .swagger-ui .tag {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 6px 14px;
      margin: 4px;
    }
    
    .swagger-ui .tag a {
      color: #4f46e5;
      font-weight: 600;
      font-size: 14px;
    }
    
    .swagger-ui .tag:hover {
      background: #f8fafc;
      border-color: #6366f1;
    }
    
    /* Expand/collapse arrow */
    .swagger-ui .expand-operation {
      color: #6366f1;
    }
    
    /* Copy button */
    .swagger-ui .copy-to-clipboard {
      background: #f1f5f9;
      border-radius: 4px;
      padding: 2px 6px;
    }
    
    .swagger-ui .copy-to-clipboard:hover {
      background: #e2e8f0;
    }
    
    /* Lock icon for secured endpoints */
    .swagger-ui .authorization__btn .locked {
      color: #f59e0b;
    }
    
    .swagger-ui .authorization__btn .unlocked {
      color: #10b981;
    }
    
    /* Description text */
    .swagger-ui .markdown p, 
    .swagger-ui .markdown li {
      color: #475569;
      line-height: 1.6;
    }
    
    /* Code in description */
    .swagger-ui .markdown code {
      background: #f1f5f9;
      color: #ef4444;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
    }
    
    /* Animated logo */
    .swagger-ui .topbar .link::after {
      content: '⚡';
      margin-left: 8px;
      font-size: 20px;
    }
    
    /* Smooth transitions */
    .swagger-ui * {
      transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
    }
  `;

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customCss: CSS,
        customSiteTitle: 'E-Commerce API | Professional Documentation',
        customfavIcon: 'https://emojicdn.elk.sh/⚡',
    }));

    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });

    console.log('📚 Swagger docs: http://localhost:' + (process.env.PORT || 3000) + '/api-docs');
};

module.exports = setupSwagger;