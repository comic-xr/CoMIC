-- PostgreSQL Initialization Script for Synapse Matrix Homeserver
--
-- This script sets up the database with the correct locale and encoding
-- for Synapse. Synapse requires C locale for proper sorting and indexing.
--
-- This script runs automatically via Docker entrypoint when the container
-- first starts (mounted to /docker-entrypoint-initdb.d/)

-- Ensure the database exists with correct settings
-- Note: POSTGRES_DB env var already creates the database, but we set these
-- to document requirements

-- Set the correct locale for the synapse database
-- Synapse requires C locale for performance and correctness
ALTER DATABASE synapse SET lc_collate = 'C';
ALTER DATABASE synapse SET lc_ctype = 'C';

-- Ensure UTF8 encoding
ALTER DATABASE synapse SET client_encoding = 'UTF8';

-- Grant necessary permissions to synapse_user
GRANT ALL PRIVILEGES ON DATABASE synapse TO synapse_user;

-- Connect to synapse database to set up extensions
\c synapse;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO synapse_user;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Synapse database initialization complete';
    RAISE NOTICE 'Database: synapse';
    RAISE NOTICE 'User: synapse_user';
    RAISE NOTICE 'Encoding: UTF8';
    RAISE NOTICE 'Locale: C';
END $$;
