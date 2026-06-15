-- =============================================
-- MIGRATION 001: Create Users Table
-- Description: Initial user table for authentication
-- Created: 2026-06-13
-- =============================================

-- Enable UUID extension (for generating unique IDs)
-- UUID is better than auto-increment for security (can't guess other user IDs)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--create users table

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) unique NOT NULL,
    username VARCHAR(255) unique NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    avatar_url TEXT,
    user_role VARCHAR(255) DEFAULT 'user' CHECK (user_role IN ('user' , 'admin', 'moderator')),

     -- Account status
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    
    -- Google OAuth (for social login later)
    google_id VARCHAR(255) UNIQUE,
    
    -- Security tracking
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,  -- Account locked until this time
    
    -- Last login timestamp
    last_login TIMESTAMPTZ,
    
    -- Refresh token (for JWT)
    refresh_token TEXT,
    refresh_token_expires TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_username_check CHECK (username ~* '^[a-zA-Z0-9_]{3,30}$')
);

-- =============================================
-- INDEXES (Critical for 1M+ users!)
-- =============================================

-- Index for login (most common query: find user by email)
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email) WHERE is_active=true;

-- Index for username lookup
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

-- Index for Google OAuth lookup
CREATE INDEX IF NOT EXISTS idx_users_google ON users (google_id) WHERE google_id IS NOT NULL;

-- Index for admin queries (list users by role and date)
CREATE INDEX IF NOT EXISTS idx_users_role ON users (user_role, created_at DESC);

-- Index for recent users
CREATE INDEX IF NOT EXISTS idx_users_created ON users (created_at DESC);

-- =============================================
-- AUTOMATIC UPDATED_AT TRIGGER
-- =============================================

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();


