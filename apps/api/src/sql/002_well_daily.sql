create table if not exists well_daily (
  id bigserial primary key,
  ts date not null,
  well_bore_code text not null,
  block text not null,
  on_stream_hrs double precision,
  avg_downhole_pressure double precision,
  avg_dp_tubing double precision,
  avg_whp_p double precision,
  avg_wht_p double precision,
  dp_choke_size double precision,
  bore_oil_vol double precision,
  bore_gas_vol double precision,
  bore_wat_vol double precision,
  bore_wi_vol double precision,
  flow_kind text,
  tenant_id text not null default 'demo'
);
create index if not exists idx_well_daily_ts on well_daily(ts);
create index if not exists idx_well_daily_block on well_daily(block);
create index if not exists idx_well_daily_well on well_daily(well_bore_code);

-- Simple geostore (GeoJSON as JSONB; you can move to PostGIS later)
create table if not exists geo_blocks (
  name text primary key,
  props jsonb not null,
  geom jsonb not null  -- GeoJSON geometry
);

create table if not exists geo_wells (
  name text primary key,
  block text,
  props jsonb not null,
  geom jsonb not null
);
