-- Step 1: Ensure PostGIS extension is enabled
-- This needs to be run by a superuser on the database once.
-- The script will attempt this, but it may fail due to permissions.
-- To enable it manually, connect to your database and run: CREATE EXTENSION IF NOT EXISTS postgis;

-- Step 2: Create the tables for our geo-energy data.
-- The Python script will execute the commands below.

-- Table for production blocks
CREATE TABLE IF NOT EXISTS blocks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(100),
    operator VARCHAR(255),
    sq_km REAL,
    reserve REAL,
    -- Storing geometry with SRID 4326 (WGS 84)
    geometry GEOMETRY(MultiPolygon, 4326)
);

-- Table for wells
CREATE TABLE IF NOT EXISTS wells (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    well_bore_code VARCHAR(255) UNIQUE NOT NULL,
    block_id INTEGER REFERENCES blocks(id) ON DELETE SET NULL,
    orientation VARCHAR(100),
    status VARCHAR(100),
    purpose VARCHAR(100),
    type VARCHAR(100),
    -- Storing geometry with SRID 4326 (WGS 84)
    geometry GEOMETRY(Point, 4326)
);

-- Table for well logs
CREATE TABLE IF NOT EXISTS well_logs (
    id SERIAL PRIMARY KEY,
    well_id INTEGER REFERENCES wells(id) ON DELETE CASCADE,
    depth_md REAL,
    cali REAL,
    rdep REAL,
    gr REAL,
    rhob REAL,
    nphi REAL,
    sp REAL,
    dtc REAL,
    lithology VARCHAR(255),
    -- Add a unique constraint to prevent duplicate log entries for the same well at the same depth
    UNIQUE (well_id, depth_md)
);

-- Table for daily production data
CREATE TABLE IF NOT EXISTS daily_production (
    id SERIAL PRIMARY KEY,
    well_id INTEGER REFERENCES wells(id) ON DELETE CASCADE,
    date_prd DATE,
    on_stream_hrs REAL,
    avg_downhole_pressure REAL,
    avg_dp_tubing REAL,
    avg_whp_p REAL,
    avg_wht_p REAL,
    dp_choke_size REAL,
    oil_volume REAL,
    gas_volume REAL,
    water_volume REAL,
    water_injection_volume REAL,
    flow_kind VARCHAR(50),
    -- Add a unique constraint to prevent duplicate production entries for the same well on the same day
    UNIQUE (well_id, date_prd)
);
