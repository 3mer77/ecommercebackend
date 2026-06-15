# 🛒 E-Commerce REST API

A production-grade backend API for an e-commerce platform built with Node.js, Express, PostgreSQL, and Redis.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-18%2B-green)
![License](https://img.shields.io/badge/license-MIT-yellow)
![Load Test](https://img.shields.io/badge/load%20test-500%20users%20%7C%200%25%20errors-success)

---

## Overview

Production-grade e-commerce REST API designed for high traffic with optimal performance. Implements industry-standard patterns including JWT authentication, Redis caching, database indexing, and Docker containerization.

**Key Highlights:**
- 500+ concurrent users with 0% error rate
- Sub-3ms response times with Redis caching
- 533 requests/second sustained throughput
- Full-text search with PostgreSQL tsvector
- Professional Swagger documentation with custom theme

---

## Features

### Authentication & Authorization
- JWT-based authentication with access & refresh tokens
- Google OAuth 2.0 integration ready
- Role-based access control (User/Admin)
- Brute force protection (account locking after 5 attempts)
- Rate limiting per endpoint
- Password hashing with bcrypt (12 salt rounds)

### Product Management
- Full CRUD operations
- Advanced filtering (category, price range, stock status)
- Full-text search with relevance ranking
- Multiple sort options (price, rating, newest, bestselling)
- Pagination support
- Stock management with atomic updates
- Soft delete functionality

### Shopping Cart
- Persistent cart storage (PostgreSQL)
- Redis caching for fast reads
- Stock validation
- Quantity management
- Automatic cart totals calculation

### Performance
- Multi-layer Redis caching strategy
- 20+ optimized database indexes
- Connection pooling
- Response compression (gzip)

### Security
- SQL injection prevention (parameterized queries)
- Rate limiting (different limits per endpoint)
- Helmet.js security headers
- CORS configuration
- Input validation & sanitization
- Password strength enforcement

### Documentation
- Interactive Swagger/OpenAPI 3.0 documentation
- Custom themed UI
- Auto-generated from code comments

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | PostgreSQL 16 |
| Caching | Redis 7 |
| Auth | JWT + bcrypt |
| Docs | Swagger/OpenAPI 3.0 |
| Container | Docker + Docker Compose |
| Load Test | k6 + autocannon |

---

## Architecture
Client Request
│
▼
Middleware (Helmet, CORS, Rate Limit, Logger)
│
▼
Routes (/api/v1/auth, /products, /cart)
│
▼
Controller (HTTP handling)
│
▼
Service (Business Logic)
│
├──► Redis Cache (1-5ms)
│
└──► PostgreSQL (50ms)


**Design Patterns:** Service Layer, Repository, Middleware, Singleton

---

## Quick Start

### Prerequisites
- Node.js 18+
- Docker Desktop
- npm

### Setup
git clone https://github.com/yourusername/ecommerce-api.git
cd ecommerce-api
cp .env.example .env
docker-compose up -d
npm install
npm run db:migrate
npm run dev

### Verify
curl http://localhost:3000/health


Response: `{ "success": true, "database": "connected" }`

Swagger Docs: `http://localhost:3000/api-docs`

---

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/auth/register | Register user | No |
| POST | /api/v1/auth/login | Login user | No |
| POST | /api/v1/auth/refresh-token | Refresh token | No |
| GET | /api/v1/auth/profile | Get profile | Yes |
| POST | /api/v1/auth/logout | Logout | Yes |
| GET | /api/v1/auth/google | Google OAuth | No |

### Products

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/v1/products | List products | No |
| GET | /api/v1/products/search?q= | Search | No |
| GET | /api/v1/products/categories | Categories | No |
| GET | /api/v1/products/category/:slug | By category | No |
| GET | /api/v1/products/:id | Single product | No |
| POST | /api/v1/products | Create | Admin |
| PUT | /api/v1/products/:id | Update | Admin |
| DELETE | /api/v1/products/:id | Delete | Admin |
| PATCH | /api/v1/products/:id/stock | Update stock | Admin |

### Cart

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/v1/cart | Get cart | Yes |
| POST | /api/v1/cart/items | Add item | Yes |
| PUT | /api/v1/cart/items/:itemId | Update qty | Yes |
| DELETE | /api/v1/cart/items/:itemId | Remove item | Yes |
| DELETE | /api/v1/cart | Clear cart | Yes |

---

## Database Schema

### users
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR(255) | Unique, indexed |
| username | VARCHAR(100) | Unique, indexed |
| password_hash | VARCHAR(255) | bcrypt hashed |
| full_name | VARCHAR(255) | Display name |
| avatar_url | TEXT | Profile picture |
| role | VARCHAR(20) | user/admin/moderator |
| is_active | BOOLEAN | Account status |
| google_id | VARCHAR(255) | OAuth identifier |
| login_attempts | INTEGER | Failed login count |
| locked_until | TIMESTAMP | Account lock expiry |
| last_login | TIMESTAMP | Last successful login |
| refresh_token | TEXT | JWT refresh token |
| created_at | TIMESTAMP | Auto-generated |
| updated_at | TIMESTAMP | Auto-updated |

**Indexes:** email, username, google_id, role, created_at

### categories
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(255) | Category name |
| slug | VARCHAR(255) | URL-friendly, unique |
| description | TEXT | Category description |
| image_url | TEXT | Category image |
| parent_id | UUID | Self-reference for hierarchy |
| is_active | BOOLEAN | Visibility |
| product_count | INTEGER | Denormalized count |
| created_at | TIMESTAMP | Auto-generated |
| updated_at | TIMESTAMP | Auto-updated |

### products
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(500) | Product name |
| slug | VARCHAR(500) | URL-friendly, auto-generated |
| description | TEXT | Full description |
| price | DECIMAL(10,2) | Current price |
| compare_at_price | DECIMAL(10,2) | Original price (sales) |
| sku | VARCHAR(100) | Stock keeping unit |
| stock_quantity | INTEGER | Available stock |
| category_id | UUID | Foreign key to categories |
| images | TEXT[] | Array of image URLs |
| rating_average | DECIMAL(2,1) | Average rating (0-5) |
| rating_count | INTEGER | Number of ratings |
| sold_count | INTEGER | Units sold |
| is_active | BOOLEAN | Visibility |
| is_featured | BOOLEAN | Featured flag |
| is_in_stock | BOOLEAN | Generated from stock |
| version | INTEGER | Optimistic locking |
| created_at | TIMESTAMP | Auto-generated |
| updated_at | TIMESTAMP | Auto-updated |
| deleted_at | TIMESTAMP | Soft delete |

**Indexes:** 10+ (category+price, featured, price, stock, sold_count, created, slug, full-text search)

### carts
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| is_active | BOOLEAN | Active cart flag |
| items_count | INTEGER | Denormalized count |
| total_amount | DECIMAL(10,2) | Cart total |
| created_at | TIMESTAMP | Auto-generated |
| updated_at | TIMESTAMP | Auto-updated |

### cart_items
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| cart_id | UUID | Foreign key to carts |
| product_id | UUID | Foreign key to products |
| quantity | INTEGER | Item quantity (1-99) |
| product_name | VARCHAR(500) | Denormalized |
| product_price | DECIMAL(10,2) | Denormalized |
| product_image | TEXT | Denormalized |
| created_at | TIMESTAMP | Auto-generated |
| updated_at | TIMESTAMP | Auto-updated |

---

## Security

| Feature | Implementation |
|---------|---------------|
| SQL Injection | Parameterized queries ($1, $2) |
| Passwords | bcrypt (12 salt rounds) |
| Brute Force | Account lock after 5 failures |
| Rate Limiting | Auth: 10/15min, Products: 100/min |
| JWT | Access (15min) + Refresh (7d) |
| Headers | Helmet.js |
| Validation | express-validator |
| CORS | Configurable |

---

## Performance

### Load Test Results
| Metric | Value |
|--------|-------|
| Concurrent Users | 500 |
| Requests/Second | 533 |
| Average Latency | 193ms |
| Cache Hit Rate | 99%+ |
| Error Rate | 0% |

### Caching Strategy
| Data | TTL | Purpose |
|------|-----|---------|
| Product List | 10 min | Shared by all users |
| Single Product | 30 min | Rarely changes |
| Search Results | 5 min | Varies by query |
| Categories | 1 hour | Very static |
| Cart | 2 min | Balance freshness/speed |

---

## Testing

Quick load test:
autocannon -c 100 -d 30 http://localhost:3000/api/v1/products
Advanced test (k6):
docker run --rm -v ${PWD}/test/k6:/scripts grafana/k6 run /scripts/scale-test.js

## Project Structure
src/
├── config/ # Database, Redis, Swagger setup
├── controllers/ # HTTP request handlers
├── database/
│ └── migrations/ # SQL migration files
├── middleware/ # Auth, roles, error handling
├── models/ # Database queries (SQL)
├── routes/v1/ # API endpoint definitions
├── services/ # Business logic + Redis caching
├── utils/ # JWT, response formatter
└── validators/ # Input validation rules