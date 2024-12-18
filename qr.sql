create table public.qr_users
(
    user_id    text primary key not null,
    start_time timestamp with time zone default CURRENT_TIMESTAMP,
    name       text
);

create table public.qr_gots
(
    code_id text,
    user_id text,
    time    timestamp with time zone default CURRENT_TIMESTAMP
);

create table public.qr_codes
(
    id text primary key not null
);

