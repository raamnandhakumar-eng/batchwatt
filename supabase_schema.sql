-- BatchWatt V9 production schema
-- Store money as numeric + currency_code. Do not hardcode symbols.

create table if not exists factories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency_code char(3) default 'LOCAL',
  timezone text default 'Asia/Kolkata',
  created_at timestamptz default now()
);

create table if not exists sku_aliases (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid references factories(id) on delete cascade,
  alias text not null,
  sku text not null,
  created_at timestamptz default now(),
  unique(factory_id, alias)
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid references factories(id) on delete cascade,
  sku text not null,
  name text not null,
  family text,
  kg_per_unit numeric not null default 1,
  created_at timestamptz default now(),
  unique(factory_id, sku)
);

create table if not exists machine_profiles (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid references factories(id) on delete cascade,
  machine text not null,
  avg_kw numeric not null,
  startup_spike_kw numeric default 0,
  fast_start_hour numeric,
  fast_end_hour numeric,
  staggered_start_hour numeric,
  staggered_end_hour numeric,
  shiftable boolean default true,
  created_at timestamptz default now()
);

create table if not exists factory_energy_setup (
  factory_id uuid primary key references factories(id) on delete cascade,
  lpg_kg_per_output_kg numeric default 0.14,
  kwh_per_output_kg numeric default 0.18,
  lpg_safety_stock_kg numeric default 80,
  electricity_rate_per_kwh numeric default 10,
  has_demand_charge_tariff boolean default false,
  monthly_peak_so_far_kw numeric default 0,
  demand_charge_per_kw numeric default 0,
  contracted_demand_kw numeric default 9999,
  penalty_above_contract_per_kw numeric default 0,
  updated_at timestamptz default now()
);

create table if not exists inbound_messages (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid references factories(id) on delete cascade,
  source text not null,
  external_id text,
  sender text,
  raw_text text,
  received_at timestamptz default now(),
  unique(source, external_id)
);

create table if not exists parsed_orders (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid references factories(id) on delete cascade,
  inbound_message_id uuid references inbound_messages(id) on delete set null,
  customer text,
  sku text,
  units numeric,
  due_days int,
  source_line text,
  confidence numeric default 1,
  needs_review boolean default false,
  created_at timestamptz default now()
);

create table if not exists stock_snapshots (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid references factories(id) on delete cascade,
  sku text not null,
  finished_units numeric default 0,
  packaging_units numeric default 0,
  last_known boolean default false,
  snapshot_at timestamptz default now()
);

create table if not exists energy_documents (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid references factories(id) on delete cascade,
  doc_type text check (doc_type in ('electricity_bill','lpg_receipt','meter_log','other')),
  source text,
  raw_text text,
  parsed jsonb,
  created_at timestamptz default now()
);

create table if not exists plan_runs (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid references factories(id) on delete cascade,
  run_date date default current_date,
  dispatch_plan jsonb not null,
  exceptions jsonb default '[]',
  energy_receipt jsonb not null,
  fast_profile jsonb not null,
  staggered_profile jsonb not null,
  whatsapp_summary text,
  created_at timestamptz default now()
);

create table if not exists parser_corrections (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid references factories(id) on delete cascade,
  source text,
  raw_text text,
  corrected_sku text,
  corrected_units numeric,
  corrected_due_days int,
  corrected_customer text,
  created_at timestamptz default now()
);
