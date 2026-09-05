-- Private Stock Research Database v0.1
create extension if not exists pgcrypto;

create table if not exists public.stocks (
  id uuid primary key default gen_random_uuid(),
  ticker text not null unique check (ticker = upper(ticker)),
  company_name text not null,
  exchange text,
  sector text,
  industry text,
  business_overview text,
  status text not null default 'watch' check (status in ('watch','candidate','owned','passed','archived')),
  thesis text,
  risk_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fundamental_snapshots (
  id uuid primary key default gen_random_uuid(), stock_id uuid not null references public.stocks(id) on delete cascade,
  as_of_date date not null, last_price numeric, market_cap numeric, enterprise_value numeric,
  revenue_ttm numeric, revenue_growth_yoy numeric, gross_margin numeric, operating_margin numeric, net_margin numeric,
  ebitda numeric, free_cash_flow numeric, cash_from_operations numeric, cash_and_equivalents numeric, total_debt numeric,
  shares_outstanding numeric, pe_ratio numeric, forward_pe numeric, price_to_sales numeric, ev_to_sales numeric,
  current_ratio numeric, quick_ratio numeric, dilution_yoy_pct numeric, runway_months numeric,
  source_notes text, created_at timestamptz not null default now(), unique(stock_id,as_of_date)
);

create table if not exists public.research_snapshots (
  id uuid primary key default gen_random_uuid(), stock_id uuid not null references public.stocks(id) on delete cascade,
  as_of_date date not null default current_date, summary text not null, catalysts text, risks text, valuation_notes text,
  business_update text, source_urls jsonb not null default '[]'::jsonb, created_at timestamptz not null default now()
);

create table if not exists public.screen_definitions (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, description text,
  category text not null default 'technical', active boolean not null default true, rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.technical_snapshots (
  id uuid primary key default gen_random_uuid(), stock_id uuid not null references public.stocks(id) on delete cascade,
  screen_id uuid references public.screen_definitions(id) on delete set null, as_of_date date not null default current_date,
  passed boolean, score numeric, summary text, metrics jsonb not null default '{}'::jsonb, chart_notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.news_items (
  id uuid primary key default gen_random_uuid(), stock_id uuid not null references public.stocks(id) on delete cascade,
  published_at timestamptz, headline text not null, source text, source_url text, summary text,
  significance text check (significance in ('low','medium','high','critical')), sentiment text,
  fundamental_change boolean not null default false, created_at timestamptz not null default now()
);

create table if not exists public.insider_activity (
  id uuid primary key default gen_random_uuid(), stock_id uuid not null references public.stocks(id) on delete cascade,
  transaction_date date not null, insider_name text, insider_title text, transaction_type text, shares numeric, price numeric,
  value numeric, ownership_after numeric, source_url text, notes text, created_at timestamptz not null default now()
);

create table if not exists public.institutional_activity (
  id uuid primary key default gen_random_uuid(), stock_id uuid not null references public.stocks(id) on delete cascade,
  as_of_date date not null, institution_name text, activity_type text, shares numeric, value numeric, change_pct numeric,
  source_url text, notes text, created_at timestamptz not null default now()
);

create table if not exists public.screen_runs (
  id uuid primary key default gen_random_uuid(), screen_id uuid not null references public.screen_definitions(id) on delete cascade,
  run_at timestamptz not null default now(), universe_rules jsonb not null default '{}'::jsonb, result_count integer,
  notes text
);
create table if not exists public.screen_hits (
  run_id uuid not null references public.screen_runs(id) on delete cascade,
  stock_id uuid not null references public.stocks(id) on delete cascade,
  rank integer, score numeric, metrics jsonb not null default '{}'::jsonb,
  primary key(run_id,stock_id)
);

create table if not exists public.app_settings (
  key text primary key, value jsonb not null, updated_at timestamptz not null default now()
);

insert into public.app_settings(key,value) values
 ('universe', '{"country":"US","exchanges":["NYSE","NASDAQ","AMEX"],"min_price":5,"min_market_cap_usd":300000000,"min_avg_daily_dollar_volume":null}'::jsonb)
on conflict(key) do nothing;

insert into public.screen_definitions(code,name,description,rules) values
 ('RSI7','RSI(7) candidate screen','Short-term RSI(7) screen; exact thresholds/entry logic remain configurable.', '{"indicator":"RSI","period":7}'::jsonb),
 ('MA_5_10_50','5/10/50 DMA trend system','Tracks 5, 10 and 50 day moving averages with emphasis on 50-DMA upturn and 5-DMA confirmation.', '{"moving_averages":[5,10,50],"entry_focus":"50DMA upturn + 5DMA confirmation"}'::jsonb),
 ('RSI_ICEBERG','RSI iceberg reversal','Oversold/overbought reversal framework: emerging above 25 for buy evidence; falling below 75 for sell evidence.', '{"period":14,"oversold":25,"overbought":75}'::jsonb),
 ('MONTHLY_MA4_UPTURN','4-month MA upturn','Monthly 4-period moving-average turn-up screen.', '{"timeframe":"monthly","ma_period":4,"pattern":"current > prior, prior < two_months_ago"}'::jsonb),
 ('MACD','MACD screen','MACD tracked separately from moving-average screen.', '{"indicator":"MACD"}'::jsonb),
 ('ACCUM_DIST','Accumulation / distribution evidence','Volume/price evidence consistent with institutional accumulation or distribution.', '{"signals":["volume","OBV","accumulation_distribution"]}'::jsonb)
on conflict(code) do nothing;

do $$ declare t text; begin
  foreach t in array array['stocks','fundamental_snapshots','research_snapshots','screen_definitions','technical_snapshots','news_items','insider_activity','institutional_activity','screen_runs','screen_hits','app_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists authenticated_all on public.%I', t);
    execute format('create policy authenticated_all on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

revoke all on all tables in schema public from anon;
grant select,insert,update,delete on all tables in schema public to authenticated;

create or replace view public.stock_dashboard with (security_invoker=true) as
select s.*,
 f.last_price,f.market_cap,f.revenue_growth_yoy,f.gross_margin,f.cash_and_equivalents,f.total_debt,
 exists(select 1 from public.insider_activity ia where ia.stock_id=s.id and lower(coalesce(ia.transaction_type,'')) like '%buy%' and ia.transaction_date >= current_date - 180) as significant_net_insider_buying,
 (select ts.summary from public.technical_snapshots ts where ts.stock_id=s.id order by ts.as_of_date desc,ts.created_at desc limit 1) as latest_technical_summary,
 (select max(r.as_of_date) from public.research_snapshots r where r.stock_id=s.id) as last_researched_at
from public.stocks s
left join lateral (
  select * from public.fundamental_snapshots f2 where f2.stock_id=s.id order by as_of_date desc,created_at desc limit 1
) f on true;

grant select on public.stock_dashboard to authenticated;
