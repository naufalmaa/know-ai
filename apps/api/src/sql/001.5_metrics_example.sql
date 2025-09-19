-- Daily production demo data (for tool-driven charts)
create table if not exists production_timeseries (
  ts date not null,
  oil_bopd double precision not null,
  gas_mmscfd double precision not null,
  tenant_id text not null default 'demo'
);

-- Seed ~18 months of synthetic daily data if table is empty
do $$
begin
  if not exists (select 1 from production_timeseries) then
    insert into production_timeseries(ts, oil_bopd, gas_mmscfd, tenant_id)
    select d::date,
           14000 + (random()*3000) - 1500 + 1000*sin(extract(doy from d)/58.0), -- seasonality + noise
           200 + (random()*50) - 25 + 30*sin(extract(doy from d)/45.0),
           'demo'
    from generate_series((current_date - interval '540 days')::date, current_date, interval '1 day') as d;
  end if;
end$$;
