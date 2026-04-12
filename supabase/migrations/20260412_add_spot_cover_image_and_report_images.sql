alter table flower_spots
add column if not exists cover_image_url text;

alter table spot_reports
add column if not exists image_urls text[] not null default '{}';
