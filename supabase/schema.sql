-- 꽃놀이맵 Supabase 스키마
-- Supabase SQL Editor에 붙여넣어 실행하세요

create extension if not exists "uuid-ossp";

create table flower_spots (
  id uuid primary key default uuid_generate_v4(),
  external_place_id text,
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  flower_types text[] default '{}',
  category text not null default 'park',
  peak_month_start int,
  peak_month_end int,
  has_night_light boolean default false,
  has_parking boolean default false,
  pet_friendly boolean default false,
  photo_spot boolean default false,
  entry_fee int default 0,
  phone text,
  website_url text,
  source text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table bloom_status (
  id uuid primary key default uuid_generate_v4(),
  spot_id uuid references flower_spots(id) on delete cascade,
  year int not null,
  status text not null check (status in ('before','budding','blooming','peak','falling','done')),
  bloom_pct int check (bloom_pct between 0 and 100),
  updated_by text default 'user',
  observed_at timestamptz,
  created_at timestamptz default now()
);

create table festivals (
  id uuid primary key default uuid_generate_v4(),
  spot_id uuid references flower_spots(id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  description text,
  source_url text,
  created_at timestamptz default now()
);

create table spot_reviews (
  id uuid primary key default uuid_generate_v4(),
  spot_id uuid references flower_spots(id) on delete cascade,
  content text,
  nickname text not null default '익명',
  rating int check (rating between 1 and 5),
  signal_crowded boolean default false,
  signal_photo_spot boolean default false,
  signal_accessible boolean default false,
  signal_parking_ok boolean default false,
  bloom_status text,
  visited_at date,
  image_urls text[] default '{}',
  anon_session_id text not null,
  device_hash text,
  ip_hash text,
  moderation_status text not null default 'visible',
  created_at timestamptz default now()
);

create table spot_reports (
  id uuid primary key default uuid_generate_v4(),
  spot_id uuid references flower_spots(id) on delete set null,
  spot_name text not null,
  flower_type text,
  bloom_status text,
  entry_fee int,
  has_night_light boolean,
  has_parking boolean,
  pet_friendly boolean,
  comment text,
  nickname text not null default '익명',
  anon_session_id text not null,
  device_hash text,
  ip_hash text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now()
);

create table votes (
  id uuid primary key default uuid_generate_v4(),
  spot_id uuid references flower_spots(id) on delete cascade,
  vote_type text not null check (vote_type in ('up','down')),
  anon_session_id text not null,
  device_hash text,
  ip_hash text,
  created_at timestamptz default now(),
  unique(spot_id, anon_session_id)
);

create table posts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  content text not null,
  category text not null default 'general',
  post_password_hash text,
  nickname text not null default '익명',
  anon_session_id text not null,
  device_hash text,
  ip_hash text,
  moderation_status text not null default 'visible',
  created_at timestamptz default now()
);

create table comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references posts(id) on delete cascade,
  parent_id uuid references comments(id) on delete cascade,
  content text not null,
  nickname text not null default '익명',
  anon_session_id text not null,
  device_hash text,
  ip_hash text,
  moderation_status text not null default 'visible',
  created_at timestamptz default now()
);

-- Indexes
create index flower_spots_lat_lng_idx on flower_spots (lat, lng);
create index flower_spots_category_idx on flower_spots (category);
create index bloom_status_spot_year_idx on bloom_status (spot_id, year);
create index spot_reviews_spot_id_idx on spot_reviews (spot_id);
create index spot_reports_status_idx on spot_reports (status, created_at);

-- RLS
alter table flower_spots enable row level security;
alter table bloom_status enable row level security;
alter table festivals enable row level security;
alter table spot_reviews enable row level security;
alter table spot_reports enable row level security;
alter table votes enable row level security;
alter table posts enable row level security;
alter table comments enable row level security;

create policy "spots_read" on flower_spots for select using (true);
create policy "bloom_read" on bloom_status for select using (true);
create policy "festivals_read" on festivals for select using (true);
create policy "reviews_read" on spot_reviews for select using (moderation_status = 'visible');
create policy "reviews_insert" on spot_reviews for insert with check (true);
create policy "reports_insert" on spot_reports for insert with check (true);
create policy "votes_read" on votes for select using (true);
create policy "votes_insert" on votes for insert with check (true);
create policy "posts_read" on posts for select using (moderation_status = 'visible');
create policy "posts_insert" on posts for insert with check (true);
create policy "comments_read" on comments for select using (moderation_status = 'visible');
create policy "comments_insert" on comments for insert with check (true);
