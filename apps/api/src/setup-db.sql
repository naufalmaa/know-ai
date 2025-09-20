-- Ensure database schema exists
DO $$
BEGIN
    -- Check if tables exist, if not create them
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE NOTICE 'Creating database schema...';
        
        -- Create extensions
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
        
        -- Create users table
        CREATE TABLE users(
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            role TEXT NOT NULL DEFAULT 'user',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Create folders table
        CREATE TABLE folders(
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
            owner_id UUID REFERENCES users(id),
            name TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Create files table
        CREATE TABLE files(
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
            owner_id UUID REFERENCES users(id),
            filename TEXT NOT NULL,
            mime_type TEXT,
            size BIGINT,
            checksum TEXT,
            s3_key TEXT NOT NULL UNIQUE,
            version INT NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Create file_metadata table
        CREATE TABLE file_metadata(
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            file_id UUID REFERENCES files(id) ON DELETE CASCADE,
            doc_type TEXT,
            basin TEXT,
            block TEXT,
            well_name TEXT,
            survey_type TEXT,
            formation TEXT,
            indexed BOOLEAN DEFAULT false,
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(file_id)
        );
        
        -- Create sessions table
        CREATE TABLE sessions(
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id),
            token TEXT UNIQUE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            expires_at TIMESTAMPTZ
        );
        
        -- Insert demo user
        INSERT INTO users(id, email, role) VALUES ('550e8400-e29b-41d4-a716-446655440000', 'demo@example.com', 'user')
        ON CONFLICT (email) DO NOTHING;
        
        RAISE NOTICE 'Database schema created successfully!';
    ELSE
        RAISE NOTICE 'Database schema already exists.';
    END IF;
END
$$;